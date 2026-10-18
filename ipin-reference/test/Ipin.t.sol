// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {Ipin} from "../contracts/Ipin.sol";

contract MockToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "bal");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "bal");
        require(allowance[from][msg.sender] >= amount, "allow");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract IpinTest is Test {
    MockToken usdc;
    MockToken eurc;
    Ipin ipin;
    address owner = address(0xA11CE);
    address a = address(0x1);
    address b = address(0x2);

    function setUp() public {
        usdc = new MockToken();
        eurc = new MockToken();
        ipin = new Ipin(address(usdc), address(eurc));
        usdc.mint(owner, 1_000_000_000);
        eurc.mint(owner, 1_000_000_000);
        vm.startPrank(owner);
        usdc.approve(address(ipin), type(uint256).max);
        eurc.approve(address(ipin), type(uint256).max);
        vm.stopPrank();
    }

    function _pot(address token) internal returns (uint256 id) {
        address[] memory members = new address[](2);
        members[0] = a;
        members[1] = b;
        uint96[] memory shares = new uint96[](2);
        shares[0] = 50;
        shares[1] = 50;
        vm.prank(owner);
        id = ipin.createPot("crew", token, members, shares);
    }

    function testCreateAndFundAndPayOnceUsdc() public {
        uint256 id = _pot(address(usdc));
        vm.prank(owner);
        ipin.fund(id, 1_000_000);
        vm.prank(owner);
        ipin.pay(id, a);
        assertEq(usdc.balanceOf(a), 500_000);
        vm.prank(owner);
        vm.expectRevert(Ipin.AlreadyPaid.selector);
        ipin.pay(id, a);
    }

    function testEurcPotPaysEurc() public {
        uint256 id = _pot(address(eurc));
        vm.prank(owner);
        ipin.fund(id, 2_000_000);
        vm.prank(owner);
        ipin.payAll(id);
        assertEq(eurc.balanceOf(a), 1_000_000);
        assertEq(eurc.balanceOf(b), 1_000_000);
        assertEq(usdc.balanceOf(a), 0);
    }

    function testRejectsUnknownToken() public {
        address[] memory members = new address[](1);
        members[0] = a;
        uint96[] memory shares = new uint96[](1);
        shares[0] = 1;
        vm.prank(owner);
        vm.expectRevert(Ipin.BadToken.selector);
        ipin.createPot("x", address(0xBEEF), members, shares);
    }

    function testStrangerCannotPay() public {
        uint256 id = _pot(address(usdc));
        vm.prank(owner);
        ipin.fund(id, 1_000_000);
        vm.prank(a);
        vm.expectRevert(Ipin.NotOwner.selector);
        ipin.pay(id, a);
    }
}
