// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title IPINDistributor
/// @notice USDC distribution layer. Owner creates pots, funds them with USDC, and pays recipients.
/// @dev Token is fixed to the USDC address supplied at construction (one per deployment).
///      On Arc Testnet: deploy with the Arc Testnet USDC address.
///      On Arc Mainnet: redeploy with the Arc Mainnet USDC address.
contract IPINDistributor is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────
    // Immutable USDC reference
    // ─────────────────────────────────────────────

    /// @notice The only ERC-20 token accepted by this distributor (USDC).
    address public immutable usdc;

    // ─────────────────────────────────────────────
    // Ownership and fees
    // ─────────────────────────────────────────────

    address public owner;
    address public feeRecipient;

    uint256 public constant FEE_BPS = 25;
    uint256 public constant FEE_BPS_DENOMINATOR = 10_000;
    uint256 public constant FEE_CAP = 20_000_000;

    // ─────────────────────────────────────────────
    // Data structures
    // ─────────────────────────────────────────────

    struct Recipient {
        address addr;
        uint256 amount; // USDC amount (6 decimals)
        bool paid;
        bool failed;
    }

    struct Pot {
        string name;
        address owner;
        Recipient[] recipients;
        uint256 totalAllocated; // sum of all recipient amounts
        uint256 fundedAmount; // USDC deposited (balance-delta accounted)
        uint256 paidOut; // sum of successful payouts so far
        bool closed; // set by closePot(); enables withdraw()
    }

    // ─────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────

    error Unauthorized();
    error PotClosed();
    error PotNotClosed();
    error ArrayLengthMismatch();
    error EmptyRecipients();
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientFunds();
    error NothingToWithdraw();
    error InvalidPotId();
    error InvalidRange();
    error InvalidToken();

    // ─────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────

    event PotCreated(uint256 indexed potId, address indexed owner, string name, uint256 totalAllocated);
    event PotFunded(uint256 indexed potId, uint256 received, uint256 newTotal);
    event PotPaid(uint256 indexed potId, uint256 totalPaid);
    event PotSealed(uint256 indexed potId);
    event PotWithdrawn(uint256 indexed potId, address indexed to, uint256 amount);
    event RecipientRetried(uint256 indexed potId, address indexed recipient, bool succeeded);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event FeeRecipientUpdated(address indexed previous, address indexed next);
    event FeeCharged(uint256 indexed potId, uint256 fee);

    // ─────────────────────────────────────────────
    // Storage
    // ─────────────────────────────────────────────

    uint256 public potCount;
    mapping(uint256 => Pot) private _pots;

    // ─────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    // ─────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────

    /// @param _usdc USDC token address for this deployment.
    ///              Arc Testnet: 0x3600000000000000000000000000000000000000
    ///              Arc Mainnet: set at mainnet deploy time.
    constructor(address _usdc, address _owner, address _feeRecipient) {
        if (_usdc == address(0)) revert ZeroAddress();
        if (_owner == address(0)) revert ZeroAddress();
        if (_feeRecipient == address(0)) revert ZeroAddress();
        if (_usdc.code.length == 0) revert InvalidToken();

        usdc = _usdc;
        owner = _owner;
        feeRecipient = _feeRecipient;
        potCount = 1; // first valid pot id is 1

        emit OwnershipTransferred(address(0), _owner);
        emit FeeRecipientUpdated(address(0), _feeRecipient);
    }

    // ─────────────────────────────────────────────
    // External — ownership and fees
    // ─────────────────────────────────────────────

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();

        address previousOwner = owner;
        owner = newOwner;

        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();

        address previous = feeRecipient;
        feeRecipient = newRecipient;

        emit FeeRecipientUpdated(previous, newRecipient);
    }

    function calculateFee(uint256 amount) public pure returns (uint256) {
        // Guard against overflow before multiplication; any amount this large
        // will exceed the cap anyway, so return early.
        if (amount > type(uint256).max / FEE_BPS) return FEE_CAP;
        uint256 fee = (amount * FEE_BPS) / FEE_BPS_DENOMINATOR;
        if (fee > FEE_CAP) return FEE_CAP;
        return fee;
    }

    // ─────────────────────────────────────────────
    // External — pot lifecycle
    // ─────────────────────────────────────────────

    /// @notice Create a new distribution pot.
    /// @param name      Human-readable pot name.
    /// @param recipients Addresses to receive USDC.
    /// @param amounts   Corresponding USDC amounts (6 decimals). Equal split: caller computes equal shares.
    /// @return potId    Newly created pot identifier (starts at 1).
    function createPot(
        string calldata name,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external returns (uint256 potId) {
        if (recipients.length != amounts.length) revert ArrayLengthMismatch();
        if (recipients.length == 0) revert EmptyRecipients();

        uint256 totalAllocated = 0;
        potId = potCount;
        Pot storage pot = _pots[potId];

        pot.name = name;
        pot.owner = msg.sender;

        uint256 length = recipients.length;
        for (uint256 i = 0; i < length; ++i) {
            address recipientAddr = recipients[i];
            uint256 amount = amounts[i];
            if (recipientAddr == address(0)) revert ZeroAddress();
            if (amount == 0) revert ZeroAmount();
            pot.recipients.push(Recipient({addr: recipientAddr, amount: amount, paid: false, failed: false}));
            totalAllocated += amount;
        }

        pot.totalAllocated = totalAllocated;

        unchecked {
            potCount = potId + 1;
        }

        emit PotCreated(potId, msg.sender, name, totalAllocated);
    }

    /// @notice Fund a pot by transferring USDC from the caller.
    /// @dev Uses balance-delta accounting to handle fee-on-transfer tokens defensively.
    function fund(uint256 potId, uint256 amount) external nonReentrant {
        Pot storage pot = _getPot(potId);
        if (pot.owner != msg.sender) revert Unauthorized();
        if (pot.closed) revert PotClosed();
        if (amount == 0) revert ZeroAmount();

        uint256 fee = calculateFee(amount);
        uint256 totalPull = amount + fee;

        IERC20 token = IERC20(usdc);
        uint256 balanceBefore = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), totalPull);
        uint256 received = token.balanceOf(address(this)) - balanceBefore;
        if (received < totalPull) revert InsufficientFunds();

        token.safeTransfer(feeRecipient, fee);

        pot.fundedAmount += amount;
        emit FeeCharged(potId, fee);
        emit PotFunded(potId, amount, pot.fundedAmount);
    }

    /// @notice Pay all unpaid recipients atomically. Reverts if any transfer fails.
    /// @dev All-or-nothing: if any individual transfer reverts, the whole transaction reverts.
    ///      Requires pot to be sufficiently funded (fundedAmount >= totalAllocated).
    ///      Does NOT close the pot — call closePot() when satisfied.
    ///      For resilient best-effort payout (skip failures), use payBestEffort().
    function payAll(uint256 potId) external nonReentrant {
        Pot storage pot = _getPot(potId);
        if (pot.owner != msg.sender) revert Unauthorized();
        if (pot.closed) revert PotClosed();
        if (pot.fundedAmount < pot.totalAllocated) revert InsufficientFunds();

        uint256 totalPaid = 0;
        uint256 length = pot.recipients.length;
        for (uint256 i = 0; i < length; ++i) {
            Recipient storage r = pot.recipients[i];
            if (r.paid) continue;
            // CEI: mark paid before external call
            r.paid = true;
            pot.paidOut += r.amount;
            totalPaid += r.amount;
            // Strict: SafeERC20 reverts on failure, rolling back the entire transaction
            IERC20(usdc).safeTransfer(r.addr, r.amount);
        }

        emit PotPaid(potId, totalPaid);
    }

    /// @notice Best-effort payout: skips recipients whose transfer fails, marking them `failed`.
    /// @dev Resilient variant. Failed recipients can be retried with retryFailed() / retryFailedRange().
    ///      Does NOT require full funding. Does NOT close the pot.
    function payBestEffort(uint256 potId) external nonReentrant {
        Pot storage pot = _getPot(potId);
        if (pot.owner != msg.sender) revert Unauthorized();
        if (pot.closed) revert PotClosed();

        uint256 totalPaid = 0;
        uint256 length = pot.recipients.length;
        for (uint256 i = 0; i < length; ++i) {
            totalPaid += _processRecipientPayment(pot, i);
        }

        emit PotPaid(potId, totalPaid);
    }

    /// @notice Pay a bounded range of recipients (for large pots exceeding block gas).
    /// @param start Inclusive start index.
    /// @param end   Exclusive end index.
    function payRange(uint256 potId, uint256 start, uint256 end) external nonReentrant {
        Pot storage pot = _getPot(potId);
        if (pot.owner != msg.sender) revert Unauthorized();
        if (pot.closed) revert PotClosed();

        uint256 length = pot.recipients.length;
        if (start >= end || end > length) revert InvalidRange();

        for (uint256 i = start; i < end; ++i) {
            _processRecipientPayment(pot, i);
        }
    }

    /// @notice Retry previously failed recipients. Best-effort: still marks failed on second failure.
    /// @dev Use retryFailedRange for large pots to avoid gas DoS.
    function retryFailed(uint256 potId) external nonReentrant {
        Pot storage pot = _getPot(potId);
        if (pot.owner != msg.sender) revert Unauthorized();
        if (pot.closed) revert PotClosed();

        uint256 length = pot.recipients.length;
        for (uint256 i = 0; i < length; ++i) {
            _retryRecipient(pot, potId, i);
        }
    }

    /// @notice Retry failed recipients in a bounded range (for large pots).
    function retryFailedRange(uint256 potId, uint256 start, uint256 end) external nonReentrant {
        Pot storage pot = _getPot(potId);
        if (pot.owner != msg.sender) revert Unauthorized();
        if (pot.closed) revert PotClosed();

        uint256 length = pot.recipients.length;
        if (start >= end || end > length) revert InvalidRange();

        for (uint256 i = start; i < end; ++i) {
            _retryRecipient(pot, potId, i);
        }
    }

    /// @notice Close the pot. Required before withdraw(). Owner confirms payout state is acceptable.
    function closePot(uint256 potId) external {
        Pot storage pot = _getPot(potId);
        if (pot.owner != msg.sender) revert Unauthorized();
        if (pot.closed) revert PotClosed();
        pot.closed = true;
        emit PotSealed(potId);
    }

    /// @notice Withdraw remaining USDC (overfunding or failed-recipient residual) after pot is closed.
    function withdraw(uint256 potId, address to) external nonReentrant {
        Pot storage pot = _getPot(potId);
        if (pot.owner != msg.sender) revert Unauthorized();
        if (!pot.closed) revert PotNotClosed();
        if (to == address(0)) revert ZeroAddress();

        uint256 remaining = pot.fundedAmount - pot.paidOut;
        if (remaining == 0) revert NothingToWithdraw();

        // Update state before transfer (CEI)
        pot.fundedAmount = pot.paidOut;
        IERC20(usdc).safeTransfer(to, remaining);

        emit PotWithdrawn(potId, to, remaining);
    }

    // ─────────────────────────────────────────────
    // View functions
    // ─────────────────────────────────────────────

    function getPot(uint256 potId)
        external
        view
        returns (
            string memory name,
            address potOwner,
            uint256 totalAllocated,
            uint256 fundedAmount,
            uint256 paidOut,
            bool closed
        )
    {
        Pot storage pot = _getPot(potId);
        return (pot.name, pot.owner, pot.totalAllocated, pot.fundedAmount, pot.paidOut, pot.closed);
    }

    function getRecipients(uint256 potId) external view returns (Recipient[] memory) {
        Pot storage pot = _getPot(potId);
        uint256 length = pot.recipients.length;
        Recipient[] memory out = new Recipient[](length);
        for (uint256 i = 0; i < length; ++i) {
            out[i] = pot.recipients[i];
        }
        return out;
    }

    // ─────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────

    /// @dev CEI: mark state BEFORE the external transfer to prevent reentrancy double-payment.
    function _processRecipientPayment(Pot storage pot, uint256 idx) internal returns (uint256) {
        Recipient storage r = pot.recipients[idx];
        if (r.paid || r.failed) return 0;

        // CEI: set state before external call
        r.paid = true;
        pot.paidOut += r.amount;

        bool ok = _attemptTransfer(r.addr, r.amount);
        if (!ok) {
            // Roll back on failure
            r.paid = false;
            r.failed = true;
            pot.paidOut -= r.amount;
            return 0;
        }

        return r.amount;
    }

    function _retryRecipient(Pot storage pot, uint256 potId, uint256 idx) internal {
        Recipient storage r = pot.recipients[idx];
        if (!r.failed) return;

        // CEI: set state before external call
        r.paid = true;
        r.failed = false;
        pot.paidOut += r.amount;

        bool ok = _attemptTransfer(r.addr, r.amount);
        if (!ok) {
            // Roll back
            r.paid = false;
            r.failed = true;
            pot.paidOut -= r.amount;
        }

        emit RecipientRetried(potId, r.addr, ok);
    }

    /// @dev Non-reverting transfer attempt. Requires code at token address.
    ///      Uses raw IERC20.transfer (not SafeERC20) so try/catch can intercept reverts.
    function _attemptTransfer(address to, uint256 amount) internal returns (bool) {
        if (usdc.code.length == 0) return false;
        try IERC20(usdc).transfer(to, amount) returns (bool ok) {
            return ok;
        } catch {
            return false;
        }
    }

    function _getPot(uint256 potId) internal view returns (Pot storage pot) {
        if (potId == 0 || potId >= potCount) revert InvalidPotId();
        pot = _pots[potId];
    }
}
