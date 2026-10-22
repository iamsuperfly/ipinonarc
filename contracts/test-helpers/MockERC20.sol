// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @dev Minimal ERC-20 mock used in Foundry unit tests.
///      Supports mint, approve, transfer, transferFrom, balanceOf, allowance, decimals.
///      Optionally set `rejectTransferTo` to make transfers to that address revert —
///      used to simulate payBestEffort / retryFailed failure paths.
contract MockERC20 {
    string public name;
    string public symbol;
    uint8  public decimals;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 public totalSupply;

    // If set, transfer() to this address returns false (simulates a non-reverting failure).
    address public rejectTransferTo;
    // If set, transfer() to this address reverts (simulates a reverting failure).
    address public revertTransferTo;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name     = _name;
        symbol   = _symbol;
        decimals = _decimals;
    }

    function mint(address to, uint256 amount) external {
        _balances[to] += amount;
        totalSupply    += amount;
        emit Transfer(address(0), to, amount);
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner_, address spender) external view returns (uint256) {
        return _allowances[owner_][spender];
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (to == revertTransferTo) revert("MockERC20: forced revert");
        if (to == rejectTransferTo) return false;
        require(_balances[msg.sender] >= amount, "MockERC20: insufficient balance");
        _balances[msg.sender] -= amount;
        _balances[to]         += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (to == revertTransferTo) revert("MockERC20: forced revert");
        if (to == rejectTransferTo) return false;
        require(_balances[from] >= amount, "MockERC20: insufficient balance");
        require(_allowances[from][msg.sender] >= amount, "MockERC20: insufficient allowance");
        _allowances[from][msg.sender] -= amount;
        _balances[from]               -= amount;
        _balances[to]                 += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    // ── helpers for tests ────────────────────────────────────────────────────
    function setRejectTransferTo(address target) external {
        rejectTransferTo = target;
    }

    function setRevertTransferTo(address target) external {
        revertTransferTo = target;
    }
}
