// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../IPINDistributor.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Fork test against Arc Testnet.
/// Verifies that payAll reverts when a blacklisted recipient is in the pot,
/// and payBestEffort skips them, pays everyone else, leaving residual withdrawable.
contract IPINBlacklistForkTest is Test {
    // Arc Testnet constants
    address constant USDC          = 0x3600000000000000000000000000000000000000;
    address constant BLACKLISTED   = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    string  constant ARC_TESTNET_RPC = "https://rpc.testnet.arc.io";

    IPINDistributor distributor;
    address owner      = address(0xBEEF);
    address feeRecip   = address(0xFEE1);
    address recipient1 = address(0xA001);
    address recipient2 = BLACKLISTED; // confirmed blacklisted on Arc Testnet
    address recipient3 = address(0xA003);

    uint256 forkId;

    function setUp() public {
        forkId = vm.createSelectFork(ARC_TESTNET_RPC);

        // Deploy fresh distributor on the fork
        vm.prank(owner);
        distributor = new IPINDistributor(USDC, owner, feeRecip);

        // Arc USDC is a native precompile — deal() can't find its storage slot.
        // Instead impersonate a whale or the minter to transfer USDC to owner.
        // On Arc Testnet, the USDC minter/owner can mint — find a funded address via prank.
        // Simplest: use vm.store with the known ERC20 balances slot (slot 0 for FiatToken).
        // FiatTokenV2_2 stores balances at keccak256(addr . slot9) — slot 9 is balanceAndBlacklist.
        // We calculate the slot directly.
        bytes32 balanceSlot = keccak256(abi.encode(owner, uint256(9)));
        // Pack: balance in upper 128 bits (bits 255-128), blacklisted flag in bit 0
        // balance = 1_000_000_000 (1000 USDC, 6 dec), not blacklisted
        uint256 packed = uint256(1_000_000_000) << 128;
        vm.store(USDC, balanceSlot, bytes32(packed));
    }

    function test_payAll_revertsWithBlacklistedRecipient() public {
        // Create pot with 3 recipients — one blacklisted
        address[] memory recipients = new address[](3);
        uint256[] memory amounts    = new uint256[](3);
        recipients[0] = recipient1;
        recipients[1] = recipient2; // blacklisted
        recipients[2] = recipient3;
        amounts[0] = 100_000_000; // 100 USDC
        amounts[1] = 100_000_000; // 100 USDC
        amounts[2] = 100_000_000; // 100 USDC

        vm.startPrank(owner);
        uint256 potId = distributor.createPot("blacklist-test", recipients, amounts);

        // Calculate fee and approve total
        uint256 fee = distributor.calculateFee(300_000_000);
        IERC20(USDC).approve(address(distributor), 300_000_000 + fee);
        distributor.fund(potId, 300_000_000);

        // payAll should REVERT because recipient2 is blacklisted
        vm.expectRevert();
        distributor.payAll(potId);
        vm.stopPrank();

        console.log("PASS: payAll reverted due to blacklisted recipient");
    }

    function test_payBestEffort_skipsBlacklistedAndPaysRest() public {
        // Create pot with 3 recipients — one blacklisted
        address[] memory recipients = new address[](3);
        uint256[] memory amounts    = new uint256[](3);
        recipients[0] = recipient1;
        recipients[1] = recipient2; // blacklisted
        recipients[2] = recipient3;
        amounts[0] = 100_000_000;
        amounts[1] = 100_000_000;
        amounts[2] = 100_000_000;

        vm.startPrank(owner);
        uint256 potId = distributor.createPot("bestEffort-test", recipients, amounts);

        uint256 fee = distributor.calculateFee(300_000_000);
        IERC20(USDC).approve(address(distributor), 300_000_000 + fee);
        distributor.fund(potId, 300_000_000);

        uint256 r1Before = IERC20(USDC).balanceOf(recipient1);
        uint256 r3Before = IERC20(USDC).balanceOf(recipient3);

        // payBestEffort should succeed, skip recipient2
        distributor.payBestEffort(potId);
        vm.stopPrank();

        uint256 r1After = IERC20(USDC).balanceOf(recipient1);
        uint256 r3After = IERC20(USDC).balanceOf(recipient3);

        // recipient1 and recipient3 got paid
        assertEq(r1After - r1Before, 100_000_000, "recipient1 should receive 100 USDC");
        assertEq(r3After - r3Before, 100_000_000, "recipient3 should receive 100 USDC");

        // blacklisted recipient2 got nothing
        assertEq(IERC20(USDC).balanceOf(recipient2), 0, "blacklisted recipient should have 0");

        // residual (100 USDC for recipient2) stays in pot
        (,, uint256 totalAllocated, uint256 fundedAmount, uint256 paidOut, bool closed) = distributor.getPot(potId);
        uint256 residual = fundedAmount - paidOut;
        assertEq(residual, 100_000_000, "residual should be 100 USDC");
        assertFalse(closed, "pot should not be auto-closed when bestEffort has failures");

        console.log("PASS: payBestEffort skipped blacklisted, paid others, residual withdrawable");
        console.log("residual in pot:", residual);
        console.log("recipient1 received:", r1After - r1Before);
        console.log("recipient3 received:", r3After - r3Before);
    }

    function test_withdraw_residualAfterPayBestEffort() public {
        address[] memory recipients = new address[](2);
        uint256[] memory amounts    = new uint256[](2);
        recipients[0] = recipient2; // blacklisted — all will fail
        recipients[1] = recipient3;
        amounts[0] = 50_000_000;
        amounts[1] = 50_000_000;

        vm.startPrank(owner);
        uint256 potId = distributor.createPot("withdraw-test", recipients, amounts);

        uint256 fee = distributor.calculateFee(100_000_000);
        IERC20(USDC).approve(address(distributor), 100_000_000 + fee);
        distributor.fund(potId, 100_000_000);

        distributor.payBestEffort(potId);

        // Close pot manually since bestEffort didn't auto-close (has failures)
        distributor.closePot(potId);

        uint256 ownerBefore = IERC20(USDC).balanceOf(owner);
        distributor.withdraw(potId, owner);
        uint256 ownerAfter = IERC20(USDC).balanceOf(owner);

        assertEq(ownerAfter - ownerBefore, 50_000_000, "owner should withdraw 50 USDC residual");
        console.log("PASS: owner withdrew residual after bestEffort failure");
        vm.stopPrank();
    }
}
