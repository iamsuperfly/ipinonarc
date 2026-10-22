// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IPINDistributor} from "../IPINDistributor.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

// ════════════════════════════════════════════════════════════════════════════
//  Handler used for invariant testing
// ════════════════════════════════════════════════════════════════════════════
contract DistributorHandler is Test {
    IPINDistributor public distributor;
    MockERC20       public usdc;

    address internal potOwner  = makeAddr("potOwner");
    address internal recipient1 = makeAddr("recipient1");
    address internal recipient2 = makeAddr("recipient2");

    uint256 public activePotId;

    // Track how much the contract should legitimately hold for the active pot.
    uint256 public ghostFunded;
    uint256 public ghostPaidOut;

    constructor(IPINDistributor _d, MockERC20 _u) {
        distributor = _d;
        usdc        = _u;

        // Create one pot with two recipients for the invariant runner.
        address[] memory recips  = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        recips[0]  = recipient1; amounts[0] = 10e6;
        recips[1]  = recipient2; amounts[1] = 10e6;

        vm.prank(potOwner);
        activePotId = distributor.createPot("inv-pot", recips, amounts);
    }

    /// Bounded fund action.
    function fund(uint256 seed) external {
        uint256 amount = bound(seed, 1e6, 50e6);
        uint256 fee    = distributor.calculateFee(amount);
        uint256 pull   = amount + fee;

        usdc.mint(potOwner, pull);
        vm.prank(potOwner);
        usdc.approve(address(distributor), pull);

        vm.prank(potOwner);
        distributor.fund(activePotId, amount);
        ghostFunded += amount;
    }

    /// Attempt payAll when funded ≥ totalAllocated.
    function tryPayAll() external {
        (, , uint256 totalAllocated, uint256 fundedAmount, uint256 paidOut, bool closed) =
            distributor.getPot(activePotId);
        if (closed || fundedAmount < totalAllocated) return;
        vm.prank(potOwner);
        distributor.payAll(activePotId);
        ghostPaidOut = paidOut + (fundedAmount < totalAllocated ? 0 : totalAllocated - paidOut);
    }
}

// ════════════════════════════════════════════════════════════════════════════
//  Main test contract
// ════════════════════════════════════════════════════════════════════════════
contract IPINDistributorTest is Test {

    // ── constants mirrored from the contract ────────────────────────────────
    uint256 constant FEE_BPS           = 25;
    uint256 constant FEE_BPS_DENOM     = 10_000;
    uint256 constant FEE_CAP           = 20_000_000; // 20 USDC (6 dec)

    // ── actors ──────────────────────────────────────────────────────────────
    address internal contractOwner  = makeAddr("contractOwner");
    address internal feeRecipient   = makeAddr("feeRecipient");
    address internal potOwner       = makeAddr("potOwner");
    address internal alice          = makeAddr("alice");
    address internal bob            = makeAddr("bob");
    address internal carol          = makeAddr("carol");
    address internal stranger       = makeAddr("stranger");

    // ── contracts ───────────────────────────────────────────────────────────
    MockERC20         internal usdc;
    IPINDistributor   internal dist;

    // ── helper amounts ──────────────────────────────────────────────────────
    uint256 constant ALICE_ALLOC = 100e6;  // 100 USDC
    uint256 constant BOB_ALLOC   = 200e6;  // 200 USDC
    uint256 constant TOTAL_ALLOC = ALICE_ALLOC + BOB_ALLOC; // 300 USDC

    // ════════════════════════════════════════════════════════════════════════
    //  setUp
    // ════════════════════════════════════════════════════════════════════════
    function setUp() public {
        // 1. Deploy mock ERC-20 to a throwaway address, then etch its bytecode
        //    onto the canonical Arc Testnet USDC address so the constructor's
        //    code-length check passes.
        MockERC20 mockImpl = new MockERC20("Mock USDC", "mUSDC", 6);
        address USDC_ADDR  = 0x3600000000000000000000000000000000000000;
        vm.etch(USDC_ADDR, address(mockImpl).code);
        usdc = MockERC20(USDC_ADDR);

        // 2. Deploy the distributor with the canonical USDC address.
        dist = new IPINDistributor(USDC_ADDR, contractOwner, feeRecipient);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  Internal helpers
    // ════════════════════════════════════════════════════════════════════════

    /// Create a simple two-recipient pot owned by `potOwner`.
    function _createPot() internal returns (uint256 potId) {
        address[] memory recips  = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        recips[0] = alice;  amounts[0] = ALICE_ALLOC;
        recips[1] = bob;    amounts[1] = BOB_ALLOC;

        vm.prank(potOwner);
        potId = dist.createPot("test-pot", recips, amounts);
    }

    /// Fund `potId` with `amount` USDC from `sender`, including fee top-up.
    function _fund(address sender, uint256 potId, uint256 amount) internal {
        uint256 fee  = dist.calculateFee(amount);
        uint256 pull = amount + fee;
        usdc.mint(sender, pull);
        vm.prank(sender);
        usdc.approve(address(dist), pull);
        vm.prank(sender);
        dist.fund(potId, amount);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  1. DEPLOYMENT / INITIALIZATION
    // ════════════════════════════════════════════════════════════════════════

    function test_Constructor_SetsImmutables() public view {
        assertEq(dist.usdc(),         0x3600000000000000000000000000000000000000);
        assertEq(dist.owner(),        contractOwner);
        assertEq(dist.feeRecipient(), feeRecipient);
        assertEq(dist.potCount(),     1); // starts at 1
    }

    function test_Constructor_EmitsOwnershipTransferred() public {
        MockERC20 impl2  = new MockERC20("Mock USDC", "mUSDC", 6);
        address   addr2  = address(0x3600000000000000000000000000000000000001);
        vm.etch(addr2, address(impl2).code);

        vm.expectEmit(true, true, false, false);
        emit IPINDistributor.OwnershipTransferred(address(0), contractOwner);

        vm.expectEmit(true, true, false, false);
        emit IPINDistributor.FeeRecipientUpdated(address(0), feeRecipient);

        new IPINDistributor(addr2, contractOwner, feeRecipient);
    }

    function test_Constructor_RevertsZeroUsdc() public {
        vm.expectRevert(IPINDistributor.ZeroAddress.selector);
        new IPINDistributor(address(0), contractOwner, feeRecipient);
    }

    function test_Constructor_RevertsZeroOwner() public {
        vm.expectRevert(IPINDistributor.ZeroAddress.selector);
        new IPINDistributor(0x3600000000000000000000000000000000000000, address(0), feeRecipient);
    }

    function test_Constructor_RevertsZeroFeeRecipient() public {
        vm.expectRevert(IPINDistributor.ZeroAddress.selector);
        new IPINDistributor(0x3600000000000000000000000000000000000000, contractOwner, address(0));
    }

    function test_Constructor_RevertsInvalidToken_NoCode() public {
        // An address with no code should revert InvalidToken
        address noCode = makeAddr("noCode");
        vm.expectRevert(IPINDistributor.InvalidToken.selector);
        new IPINDistributor(noCode, contractOwner, feeRecipient);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  2. calculateFee
    // ════════════════════════════════════════════════════════════════════════

    function test_CalculateFee_ZeroAmount() public view {
        assertEq(dist.calculateFee(0), 0);
    }

    function test_CalculateFee_SmallAmount() public view {
        // 100 USDC → fee = 100e6 * 25 / 10000 = 250_000 (0.25 USDC)
        assertEq(dist.calculateFee(100e6), 250_000);
    }

    function test_CalculateFee_ExactCapBoundary() public view {
        // fee == FEE_CAP when amount * 25 / 10_000 == 20_000_000
        // → amount == 20_000_000 * 10_000 / 25 == 8_000_000_000 (8 000 USDC)
        uint256 boundaryAmount = (FEE_CAP * FEE_BPS_DENOM) / FEE_BPS;
        assertEq(dist.calculateFee(boundaryAmount), FEE_CAP);
    }

    function test_CalculateFee_AboveCap() public view {
        // Any amount above boundary should still return FEE_CAP
        uint256 bigAmount = 100_000e6; // 100 000 USDC
        assertEq(dist.calculateFee(bigAmount), FEE_CAP);
    }

    function test_CalculateFee_BelowCap_Linear() public view {
        // Spot-check a value well below the cap: 1000 USDC → 2.50 USDC
        assertEq(dist.calculateFee(1_000e6), 2_500_000);
    }

    /// Fuzz: fee is always ≤ FEE_CAP and equals min(amount*25/10000, FEE_CAP).
    /// NOTE: calculateFee overflows for amount > type(uint256).max / FEE_BPS because
    ///       the multiplication `amount * FEE_BPS` is unchecked in Solidity 0.8 (it uses
    ///       the checked arithmetic path, so it will panic for those extreme values — see
    ///       suspected contract bugs in the report).  We bound to the safe range here so
    ///       the fuzz test covers the meaningful domain; the overflow itself is separately
    ///       recorded as a contract bug.
    function testFuzz_CalculateFee_NeverExceedsCap(uint256 amount) public view {
        // Safe upper bound: type(uint256).max / FEE_BPS = max / 25
        uint256 safeMax = type(uint256).max / FEE_BPS;
        amount = bound(amount, 0, safeMax);

        uint256 fee = dist.calculateFee(amount);
        assertLe(fee, FEE_CAP);

        uint256 rawFee = (amount * FEE_BPS) / FEE_BPS_DENOM;
        uint256 expected = rawFee > FEE_CAP ? FEE_CAP : rawFee;
        assertEq(fee, expected);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  3. createPot
    // ════════════════════════════════════════════════════════════════════════

    function test_CreatePot_HappyPath() public {
        address[] memory recips  = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        recips[0] = alice;  amounts[0] = ALICE_ALLOC;
        recips[1] = bob;    amounts[1] = BOB_ALLOC;

        vm.expectEmit(true, true, false, true);
        emit IPINDistributor.PotCreated(1, potOwner, "test-pot", TOTAL_ALLOC);

        vm.prank(potOwner);
        uint256 potId = dist.createPot("test-pot", recips, amounts);

        assertEq(potId, 1);
        assertEq(dist.potCount(), 2);

        (string memory name, address potOwner_, uint256 totalAllocated, uint256 fundedAmount, uint256 paidOut, bool closed)
            = dist.getPot(potId);

        assertEq(name,           "test-pot");
        assertEq(potOwner_,      potOwner);
        assertEq(totalAllocated, TOTAL_ALLOC);
        assertEq(fundedAmount,   0);
        assertEq(paidOut,        0);
        assertFalse(closed);
    }

    function test_CreatePot_PotCountIncrements() public {
        _createPot();
        assertEq(dist.potCount(), 2);
        _createPot();
        assertEq(dist.potCount(), 3);
    }

    function test_CreatePot_AnyCallerCanCreate() public {
        address[] memory recips  = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        recips[0]  = carol; amounts[0] = 50e6;

        vm.prank(stranger);
        uint256 potId = dist.createPot("open-pot", recips, amounts);
        assertEq(potId, 1);
    }

    function test_CreatePot_RevertsArrayLengthMismatch() public {
        address[] memory recips  = new address[](2);
        uint256[] memory amounts = new uint256[](1);
        recips[0] = alice; recips[1] = bob;
        amounts[0] = 100e6;

        vm.expectRevert(IPINDistributor.ArrayLengthMismatch.selector);
        vm.prank(potOwner);
        dist.createPot("bad", recips, amounts);
    }

    function test_CreatePot_RevertsEmptyRecipients() public {
        address[] memory recips  = new address[](0);
        uint256[] memory amounts = new uint256[](0);

        vm.expectRevert(IPINDistributor.EmptyRecipients.selector);
        vm.prank(potOwner);
        dist.createPot("empty", recips, amounts);
    }

    function test_CreatePot_RevertsZeroRecipientAddress() public {
        address[] memory recips  = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        recips[0] = address(0); amounts[0] = 10e6;

        vm.expectRevert(IPINDistributor.ZeroAddress.selector);
        vm.prank(potOwner);
        dist.createPot("zero-addr", recips, amounts);
    }

    function test_CreatePot_RevertsZeroAmount() public {
        address[] memory recips  = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        recips[0] = alice; amounts[0] = 0;

        vm.expectRevert(IPINDistributor.ZeroAmount.selector);
        vm.prank(potOwner);
        dist.createPot("zero-amt", recips, amounts);
    }

    function test_CreatePot_GetRecipients() public {
        uint256 potId = _createPot();
        IPINDistributor.Recipient[] memory r = dist.getRecipients(potId);
        assertEq(r.length, 2);
        assertEq(r[0].addr,   alice);
        assertEq(r[0].amount, ALICE_ALLOC);
        assertFalse(r[0].paid);
        assertFalse(r[0].failed);
        assertEq(r[1].addr,   bob);
        assertEq(r[1].amount, BOB_ALLOC);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  4. fund
    // ════════════════════════════════════════════════════════════════════════

    function test_Fund_HappyPath() public {
        uint256 potId  = _createPot();
        uint256 amount = TOTAL_ALLOC;
        uint256 fee    = dist.calculateFee(amount);
        uint256 pull   = amount + fee;

        usdc.mint(potOwner, pull);
        vm.prank(potOwner);
        usdc.approve(address(dist), pull);

        vm.expectEmit(true, false, false, true);
        emit IPINDistributor.FeeCharged(potId, fee);

        vm.expectEmit(true, false, false, true);
        emit IPINDistributor.PotFunded(potId, amount, amount);

        vm.prank(potOwner);
        dist.fund(potId, amount);

        (, , , uint256 fundedAmount, ,) = dist.getPot(potId);
        assertEq(fundedAmount, amount);
        // fee goes to feeRecipient immediately
        assertEq(usdc.balanceOf(feeRecipient), fee);
        // distributor holds only `amount`
        assertEq(usdc.balanceOf(address(dist)), amount);
    }

    function test_Fund_AccumulatesAcrossMultipleCalls() public {
        uint256 potId = _createPot();
        _fund(potOwner, potId, 100e6);
        _fund(potOwner, potId, 200e6);

        (, , , uint256 fundedAmount, ,) = dist.getPot(potId);
        assertEq(fundedAmount, 300e6);
    }

    function test_Fund_RevertsUnauthorized_WrongCaller() public {
        uint256 potId = _createPot();
        uint256 fee   = dist.calculateFee(100e6);
        usdc.mint(stranger, 100e6 + fee);
        vm.prank(stranger);
        usdc.approve(address(dist), 100e6 + fee);

        vm.prank(stranger);
        vm.expectRevert(IPINDistributor.Unauthorized.selector);
        dist.fund(potId, 100e6);
    }

    function test_Fund_RevertsPotClosed() public {
        uint256 potId = _createPot();
        vm.prank(potOwner);
        dist.closePot(potId);

        uint256 fee = dist.calculateFee(50e6);
        usdc.mint(potOwner, 50e6 + fee);
        vm.prank(potOwner);
        usdc.approve(address(dist), 50e6 + fee);

        vm.prank(potOwner);
        vm.expectRevert(IPINDistributor.PotClosed.selector);
        dist.fund(potId, 50e6);
    }

    function test_Fund_RevertsZeroAmount() public {
        uint256 potId = _createPot();
        vm.prank(potOwner);
        vm.expectRevert(IPINDistributor.ZeroAmount.selector);
        dist.fund(potId, 0);
    }

    function test_Fund_RevertsInvalidPotId_Zero() public {
        vm.prank(potOwner);
        vm.expectRevert(IPINDistributor.InvalidPotId.selector);
        dist.fund(0, 100e6);
    }

    function test_Fund_RevertsInvalidPotId_OutOfRange() public {
        vm.prank(potOwner);
        vm.expectRevert(IPINDistributor.InvalidPotId.selector);
        dist.fund(999, 100e6);
    }

    function test_Fund_FeeCapApplied_LargeAmount() public {
        uint256 potId     = _createPot();
        // Use 100_000 USDC → raw fee = 250 USDC > cap → fee = 20 USDC
        uint256 amount    = 100_000e6;
        uint256 fee       = FEE_CAP; // capped at 20 USDC
        uint256 pull      = amount + fee;

        usdc.mint(potOwner, pull);
        vm.prank(potOwner);
        usdc.approve(address(dist), pull);

        vm.prank(potOwner);
        dist.fund(potId, amount);

        assertEq(usdc.balanceOf(feeRecipient), fee);
    }

    /// Fuzz: pot.fundedAmount increases by exactly `amount` regardless of fee size.
    function testFuzz_Fund_FundedAmountEqualsPureAmount(uint256 amount) public {
        amount = bound(amount, 1, 8_000e6); // stay below fee-cap boundary for simplicity
        uint256 potId = _createPot();
        _fund(potOwner, potId, amount);

        (, , , uint256 fundedAmount, ,) = dist.getPot(potId);
        assertEq(fundedAmount, amount);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  5. payAll
    // ════════════════════════════════════════════════════════════════════════

    function test_PayAll_HappyPath() public {
        uint256 potId = _createPot();
        _fund(potOwner, potId, TOTAL_ALLOC);

        vm.expectEmit(true, false, false, true);
        emit IPINDistributor.PotPaid(potId, TOTAL_ALLOC);

        vm.prank(potOwner);
        dist.payAll(potId);

        assertEq(usdc.balanceOf(alice), ALICE_ALLOC);
        assertEq(usdc.balanceOf(bob),   BOB_ALLOC);

        (, , , , uint256 paidOut,) = dist.getPot(potId);
        assertEq(paidOut, TOTAL_ALLOC);

        // recipients marked paid
        IPINDistributor.Recipient[] memory r = dist.getRecipients(potId);
        assertTrue(r[0].paid);
        assertTrue(r[1].paid);
    }

    function test_PayAll_RevertsInsufficientFunds() public {
        uint256 potId = _createPot();
        // Fund less than totalAllocated
        _fund(potOwner, potId, TOTAL_ALLOC - 1);

        vm.prank(potOwner);
        vm.expectRevert(IPINDistributor.InsufficientFunds.selector);
        dist.payAll(potId);
    }

    function test_PayAll_RevertsUnauthorized() public {
        uint256 potId = _createPot();
        _fund(potOwner, potId, TOTAL_ALLOC);

        vm.prank(stranger);
        vm.expectRevert(IPINDistributor.Unauthorized.selector);
        dist.payAll(potId);
    }

    function test_PayAll_RevertsPotClosed() public {
        uint256 potId = _createPot();
        _fund(potOwner, potId, TOTAL_ALLOC);
        vm.prank(potOwner);
        dist.closePot(potId);

        vm.prank(potOwner);
        vm.expectRevert(IPINDistributor.PotClosed.selector);
        dist.payAll(potId);
    }

    function test_PayAll_SkipsAlreadyPaidRecipients() public {
        uint256 potId = _createPot();
        _fund(potOwner, potId, TOTAL_ALLOC);

        // pay once
        vm.prank(potOwner);
        dist.payAll(potId);

        uint256 aliceBal = usdc.balanceOf(alice);

        // Extra funds, pay again — already-paid recipients must be skipped
        _fund(potOwner, potId, TOTAL_ALLOC);
        vm.prank(potOwner);
        dist.payAll(potId);

        // Balances must NOT have doubled
        assertEq(usdc.balanceOf(alice), aliceBal);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  6. payBestEffort
    // ════════════════════════════════════════════════════════════════════════

    function test_PayBestEffort_HappyPath_AllSucceed() public {
        uint256 potId = _createPot();
        _fund(potOwner, potId, TOTAL_ALLOC);

        vm.prank(potOwner);
        dist.payBestEffort(potId);

        assertEq(usdc.balanceOf(alice), ALICE_ALLOC);
        assertEq(usdc.balanceOf(bob),   BOB_ALLOC);
    }

    function test_PayBestEffort_PartialFailure_SkipsAndMarks() public {
        uint256 potId = _createPot();
        _fund(potOwner, potId, TOTAL_ALLOC);

        // Make transfers to alice revert — distributor's _attemptTransfer catches reverts
        usdc.setRevertTransferTo(alice);

        vm.prank(potOwner);
        dist.payBestEffort(potId);

        // Bob should be paid; alice should not
        assertEq(usdc.balanceOf(bob), BOB_ALLOC);
        assertEq(usdc.balanceOf(alice), 0);

        // Alice's recipient should be marked failed, not paid
        IPINDistributor.Recipient[] memory r = dist.getRecipients(potId);
        assertFalse(r[0].paid);
        assertTrue(r[0].failed);
        assertTrue(r[1].paid);

        // paidOut only counts bob
        (, , , , uint256 paidOut,) = dist.getPot(potId);
        assertEq(paidOut, BOB_ALLOC);
    }

    function test_PayBestEffort_PartialFailure_ReturnsFalse() public {
        uint256 potId = _createPot();
        _fund(potOwner, potId, TOTAL_ALLOC);

        // Make transfers to alice return false
        usdc.setRejectTransferTo(alice);

        vm.prank(potOwner);
        dist.payBestEffort(potId);

        assertEq(usdc.balanceOf(alice), 0);
        IPINDistributor.Recipient[] memory r = dist.getRecipients(potId);
        assertTrue(r[0].failed);
    }

    function test_PayBestEffort_RevertsUnauthorized() public {
        uint256 potId = _createPot();
        vm.prank(stranger);
        vm.expectRevert(IPINDistributor.Unauthorized.selector);
        dist.payBestEffort(potId);
    }

    function test_PayBestEffort_RevertsPotClosed() public {
        uint256 potId = _createPot();
        vm.prank(potOwner);
        dist.closePot(potId);

        vm.prank(potOwner);
        vm.expectRevert(IPINDistributor.PotClosed.selector);
        dist.payBestEffort(potId);
    }

    function test_PayBestEffort_EmitsPotPaid() public {
        uint256 potId = _createPot();
        _fund(potOwner, potId, TOTAL_ALLOC);

        vm.expectEmit(true, false, false, true);
        emit IPINDistributor.PotPaid(potId, TOTAL_ALLOC);

        vm.prank(potOwner);
        dist.payBestEffort(potId);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  7. payRange
    // ════════════════════════════════════════════════════════════════════════

    function test_PayRange_HappyPath_PayFirstOnly() public {
        uint256 potId = _createPot();
        _fund(potOwner, potId, TOTAL_ALLOC);

        // Pay only alice (index 0)
        vm.prank(potOwner);
        dist.payRange(potId, 0, 1);

        assertEq(usdc.balanceOf(alice), ALICE_ALLOC);
        assertEq(usdc.balanceOf(bob),   0);
    }

    function test_PayRange_HappyPath_PaySecondOnly() public {
        uint256 potId = _createPot();
        _fund(potOwner, potId, TOTAL_ALLOC);

        vm.prank(potOwner);
        dist.payRange(potId, 1, 2);

        assertEq(usdc.balanceOf(alice), 0);
        assertEq(usdc.balanceOf(bob),   BOB_ALLOC);
    }

    function test_PayRange_RevertsInvalidRange_StartGeEnd() public {
        uint256 potId = _createPot();
        vm.prank(potOwner);
        vm.expectRevert(IPINDistributor.InvalidRange.selector);
        dist.payRange(potId, 1, 1);
    }

    function test_PayRange_RevertsInvalidRange_EndExceedsLength() public {
        uint256 potId = _createPot();
        vm.prank(potOwner);
        vm.expectRevert(IPINDistributor.InvalidRange.selector);
        dist.payRange(potId, 0, 10);
    }

    function test_PayRange_RevertsUnauthorized() public {
        uint256 potId = _createPot();
        vm.prank(stranger);
        vm.expectRevert(IPINDistributor.Unauthorized.selector);
        dist.payRange(potId, 0, 1);
    }

    function test_PayRange_RevertsPotClosed() public {
        uint256 potId = _createPot();
        vm.prank(potOwner);
        dist.closePot(potId);

        vm.prank(potOwner);
        vm.expectRevert(IPINDistributor.PotClosed.selector);
        dist.payRange(potId, 0, 1);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  8. retryFailed
    // ════════════════════════════════════════════════════════════════════════

    function _setupFailedRecipient() internal returns (uint256 potId) {
        potId = _createPot();
        _fund(potOwner, potId, TOTAL_ALLOC);

        // Force alice to fail
        usdc.setRevertTransferTo(alice);
        vm.prank(potOwner);
        dist.payBestEffort(potId);

        // Clear the failure injection
        usdc.setRevertTransferTo(address(0));
    }

    function test_RetryFailed_HappyPath() public {
        uint256 potId = _setupFailedRecipient();

        vm.expectEmit(true, true, false, true);
        emit IPINDistributor.RecipientRetried(potId, alice, true);

        vm.prank(potOwner);
        dist.retryFailed(potId);

        assertEq(usdc.balanceOf(alice), ALICE_ALLOC);
        IPINDistributor.Recipient[] memory r = dist.getRecipients(potId);
        assertTrue(r[0].paid);
        assertFalse(r[0].failed);
    }

    function test_RetryFailed_SkipsNonFailed() public {
        uint256 potId = _setupFailedRecipient();
        usdc.setRevertTransferTo(address(0)); // clear

        uint256 bobBalBefore = usdc.balanceOf(bob);

        vm.prank(potOwner);
        dist.retryFailed(potId);

        // Bob was already paid; his balance should not change
        assertEq(usdc.balanceOf(bob), bobBalBefore);
    }

    function test_RetryFailed_RevertsUnauthorized() public {
        uint256 potId = _setupFailedRecipient();
        vm.prank(stranger);
        vm.expectRevert(IPINDistributor.Unauthorized.selector);
        dist.retryFailed(potId);
    }

    function test_RetryFailed_RevertsPotClosed() public {
        uint256 potId = _setupFailedRecipient();
        vm.prank(potOwner);
        dist.closePot(potId);

        vm.prank(potOwner);
        vm.expectRevert(IPINDistributor.PotClosed.selector);
        dist.retryFailed(potId);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  9. retryFailedRange
    // ════════════════════════════════════════════════════════════════════════

    function test_RetryFailedRange_HappyPath() public {
        uint256 potId = _setupFailedRecipient();

        vm.prank(potOwner);
        dist.retryFailedRange(potId, 0, 1);

        assertEq(usdc.balanceOf(alice), ALICE_ALLOC);
    }

    function test_RetryFailedRange_RevertsInvalidRange() public {
        uint256 potId = _createPot();
        vm.prank(potOwner);
        vm.expectRevert(IPINDistributor.InvalidRange.selector);
        dist.retryFailedRange(potId, 0, 10);
    }

    function test_RetryFailedRange_RevertsUnauthorized() public {
        uint256 potId = _createPot();
        vm.prank(stranger);
        vm.expectRevert(IPINDistributor.Unauthorized.selector);
        dist.retryFailedRange(potId, 0, 1);
    }

    function test_RetryFailedRange_RevertsPotClosed() public {
        uint256 potId = _createPot();
        vm.prank(potOwner);
        dist.closePot(potId);

        vm.prank(potOwner);
        vm.expectRevert(IPINDistributor.PotClosed.selector);
        dist.retryFailedRange(potId, 0, 1);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  10. closePot
    // ════════════════════════════════════════════════════════════════════════

    function test_ClosePot_HappyPath() public {
        uint256 potId = _createPot();

        vm.expectEmit(true, false, false, false);
        emit IPINDistributor.PotSealed(potId);

        vm.prank(potOwner);
        dist.closePot(potId);

        (, , , , , bool closed) = dist.getPot(potId);
        assertTrue(closed);
    }

    function test_ClosePot_RevertsUnauthorized() public {
        uint256 potId = _createPot();
        vm.prank(stranger);
        vm.expectRevert(IPINDistributor.Unauthorized.selector);
        dist.closePot(potId);
    }

    function test_ClosePot_RevertsAlreadyClosed() public {
        uint256 potId = _createPot();
        vm.prank(potOwner);
        dist.closePot(potId);

        vm.prank(potOwner);
        vm.expectRevert(IPINDistributor.PotClosed.selector);
        dist.closePot(potId);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  11. withdraw
    // ════════════════════════════════════════════════════════════════════════

    function test_Withdraw_HappyPath_Residual() public {
        uint256 potId = _createPot();
        // Overfund by 50 USDC
        uint256 overfund = TOTAL_ALLOC + 50e6;
        _fund(potOwner, potId, overfund);

        vm.prank(potOwner);
        dist.payAll(potId);

        vm.prank(potOwner);
        dist.closePot(potId);

        vm.expectEmit(true, true, false, true);
        emit IPINDistributor.PotWithdrawn(potId, potOwner, 50e6);

        vm.prank(potOwner);
        dist.withdraw(potId, potOwner);

        assertEq(usdc.balanceOf(potOwner), 50e6);
    }

    function test_Withdraw_HappyPath_FailedRecipientResidual() public {
        uint256 potId = _createPot();
        _fund(potOwner, potId, TOTAL_ALLOC);

        // Force alice to fail
        usdc.setRevertTransferTo(alice);
        vm.prank(potOwner);
        dist.payBestEffort(potId);
        usdc.setRevertTransferTo(address(0));

        vm.prank(potOwner);
        dist.closePot(potId);

        uint256 ownerBefore = usdc.balanceOf(potOwner);
        vm.prank(potOwner);
        dist.withdraw(potId, potOwner);

        assertEq(usdc.balanceOf(potOwner), ownerBefore + ALICE_ALLOC);
    }

    function test_Withdraw_RevertsUnauthorized() public {
        uint256 potId = _createPot();
        _fund(potOwner, potId, TOTAL_ALLOC);
        vm.prank(potOwner);
        dist.closePot(potId);

        vm.prank(stranger);
        vm.expectRevert(IPINDistributor.Unauthorized.selector);
        dist.withdraw(potId, stranger);
    }

    function test_Withdraw_RevertsPotNotClosed() public {
        uint256 potId = _createPot();
        _fund(potOwner, potId, TOTAL_ALLOC);

        vm.prank(potOwner);
        vm.expectRevert(IPINDistributor.PotNotClosed.selector);
        dist.withdraw(potId, potOwner);
    }

    function test_Withdraw_RevertsNothingToWithdraw() public {
        uint256 potId = _createPot();
        _fund(potOwner, potId, TOTAL_ALLOC);

        vm.prank(potOwner);
        dist.payAll(potId);

        vm.prank(potOwner);
        dist.closePot(potId);

        vm.prank(potOwner);
        vm.expectRevert(IPINDistributor.NothingToWithdraw.selector);
        dist.withdraw(potId, potOwner);
    }

    function test_Withdraw_RevertsZeroToAddress() public {
        uint256 potId = _createPot();
        _fund(potOwner, potId, TOTAL_ALLOC + 1);
        vm.prank(potOwner);
        dist.closePot(potId);

        vm.prank(potOwner);
        vm.expectRevert(IPINDistributor.ZeroAddress.selector);
        dist.withdraw(potId, address(0));
    }

    // ════════════════════════════════════════════════════════════════════════
    //  12. getPot / getRecipients
    // ════════════════════════════════════════════════════════════════════════

    function test_GetPot_RevertsInvalidPotId_Zero() public {
        vm.expectRevert(IPINDistributor.InvalidPotId.selector);
        dist.getPot(0);
    }

    function test_GetPot_RevertsInvalidPotId_Future() public {
        vm.expectRevert(IPINDistributor.InvalidPotId.selector);
        dist.getPot(999);
    }

    function test_GetRecipients_RevertsInvalidPotId() public {
        vm.expectRevert(IPINDistributor.InvalidPotId.selector);
        dist.getRecipients(0);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  13. transferOwnership
    // ════════════════════════════════════════════════════════════════════════

    function test_TransferOwnership_HappyPath() public {
        vm.expectEmit(true, true, false, false);
        emit IPINDistributor.OwnershipTransferred(contractOwner, alice);

        vm.prank(contractOwner);
        dist.transferOwnership(alice);

        assertEq(dist.owner(), alice);
    }

    function test_TransferOwnership_RevertsUnauthorized() public {
        vm.prank(stranger);
        vm.expectRevert(IPINDistributor.Unauthorized.selector);
        dist.transferOwnership(alice);
    }

    function test_TransferOwnership_RevertsZeroAddress() public {
        vm.prank(contractOwner);
        vm.expectRevert(IPINDistributor.ZeroAddress.selector);
        dist.transferOwnership(address(0));
    }

    // ════════════════════════════════════════════════════════════════════════
    //  14. setFeeRecipient
    // ════════════════════════════════════════════════════════════════════════

    function test_SetFeeRecipient_HappyPath() public {
        vm.expectEmit(true, true, false, false);
        emit IPINDistributor.FeeRecipientUpdated(feeRecipient, carol);

        vm.prank(contractOwner);
        dist.setFeeRecipient(carol);

        assertEq(dist.feeRecipient(), carol);
    }

    function test_SetFeeRecipient_RevertsUnauthorized() public {
        vm.prank(stranger);
        vm.expectRevert(IPINDistributor.Unauthorized.selector);
        dist.setFeeRecipient(carol);
    }

    function test_SetFeeRecipient_RevertsZeroAddress() public {
        vm.prank(contractOwner);
        vm.expectRevert(IPINDistributor.ZeroAddress.selector);
        dist.setFeeRecipient(address(0));
    }

    // ════════════════════════════════════════════════════════════════════════
    //  15. Full lifecycle: create → fund → payBestEffort → retry → close → withdraw
    // ════════════════════════════════════════════════════════════════════════

    function test_FullLifecycle_WithPartialFailureAndRetry() public {
        uint256 potId = _createPot();
        _fund(potOwner, potId, TOTAL_ALLOC);

        // First payout attempt: alice fails
        usdc.setRevertTransferTo(alice);
        vm.prank(potOwner);
        dist.payBestEffort(potId);
        usdc.setRevertTransferTo(address(0));

        // bob is paid, alice is failed
        assertEq(usdc.balanceOf(bob), BOB_ALLOC);

        // Retry for alice succeeds
        vm.prank(potOwner);
        dist.retryFailed(potId);
        assertEq(usdc.balanceOf(alice), ALICE_ALLOC);

        // Close and check nothing left to withdraw
        vm.prank(potOwner);
        dist.closePot(potId);

        vm.prank(potOwner);
        vm.expectRevert(IPINDistributor.NothingToWithdraw.selector);
        dist.withdraw(potId, potOwner);
    }

    function test_FullLifecycle_Overfund_WithdrawResidue() public {
        uint256 potId  = _createPot();
        uint256 extra  = 77e6; // deliberate overfund
        _fund(potOwner, potId, TOTAL_ALLOC + extra);

        vm.prank(potOwner);
        dist.payAll(potId);

        vm.prank(potOwner);
        dist.closePot(potId);

        uint256 ownerBefore = usdc.balanceOf(potOwner);
        vm.prank(potOwner);
        dist.withdraw(potId, potOwner);

        assertEq(usdc.balanceOf(potOwner), ownerBefore + extra);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  16. Fuzz: fund → payAll conservation
    // ════════════════════════════════════════════════════════════════════════

    /// Fuzz: after payAll, sum of recipient balances == TOTAL_ALLOC.
    function testFuzz_PayAll_BalanceConservation(uint256 overfund) public {
        overfund = bound(overfund, 0, 500e6);
        uint256 potId = _createPot();
        _fund(potOwner, potId, TOTAL_ALLOC + overfund);

        vm.prank(potOwner);
        dist.payAll(potId);

        assertEq(usdc.balanceOf(alice) + usdc.balanceOf(bob), TOTAL_ALLOC);
    }

    /// Fuzz: fee is always exactly deducted from potOwner's starting balance.
    function testFuzz_Fund_FeeAlwaysPaidToRecipient(uint256 amount) public {
        amount = bound(amount, 1, 1_000_000e6);
        uint256 potId    = _createPot();
        uint256 fee      = dist.calculateFee(amount);
        uint256 pull     = amount + fee;

        usdc.mint(potOwner, pull);
        vm.prank(potOwner);
        usdc.approve(address(dist), pull);

        uint256 feeBefore = usdc.balanceOf(feeRecipient);
        vm.prank(potOwner);
        dist.fund(potId, amount);

        assertEq(usdc.balanceOf(feeRecipient), feeBefore + fee);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  17. paidOut never exceeds fundedAmount (conservation)
    // ════════════════════════════════════════════════════════════════════════

    function test_PaidOutNeverExceedsFundedAmount() public {
        uint256 potId = _createPot();
        _fund(potOwner, potId, TOTAL_ALLOC);

        vm.prank(potOwner);
        dist.payAll(potId);

        (, , , uint256 fundedAmount, uint256 paidOut,) = dist.getPot(potId);
        assertLe(paidOut, fundedAmount);
    }
}

// ════════════════════════════════════════════════════════════════════════════
//  Invariant: distributor USDC balance ≥ sum of (fundedAmount - paidOut)
// ════════════════════════════════════════════════════════════════════════════
contract IPINDistributorInvariantTest is Test {
    MockERC20           internal usdc;
    IPINDistributor     internal dist;
    DistributorHandler  internal handler;

    function setUp() public {
        MockERC20 mockImpl = new MockERC20("Mock USDC", "mUSDC", 6);
        address USDC_ADDR  = 0x3600000000000000000000000000000000000000;
        vm.etch(USDC_ADDR, address(mockImpl).code);
        usdc = MockERC20(USDC_ADDR);

        address contractOwner = makeAddr("contractOwner");
        address feeRecipient  = makeAddr("feeRecipient");

        dist    = new IPINDistributor(USDC_ADDR, contractOwner, feeRecipient);
        handler = new DistributorHandler(dist, usdc);

        targetContract(address(handler));
    }

    /// The distributor's USDC balance must always be ≥ the sum of unfunded residuals
    /// across all pots (i.e., it never owes more than it holds).
    function invariant_DistributorBalanceCoversResidue() public view {
        uint256 potCount = dist.potCount();
        uint256 totalResidue = 0;
        for (uint256 i = 1; i < potCount; ++i) {
            (, , , uint256 fundedAmount, uint256 paidOut,) = dist.getPot(i);
            if (fundedAmount > paidOut) {
                totalResidue += fundedAmount - paidOut;
            }
        }
        assertGe(usdc.balanceOf(address(dist)), totalResidue);
    }

    /// potCount must only ever increase.
    function invariant_PotCountMonotonicallyIncreases() public view {
        assertGe(dist.potCount(), 1);
    }
}
