// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/// @title IpinV2 — fee is pulled with the fund. Unpaid USDC can be withdrawn.
contract IpinV2 {
    IERC20 public immutable usdc;
    IERC20 public immutable eurc;
    address public immutable feeWallet;
    uint256 public constant FEE_BPS = 25;
    uint256 public constant FREE_ALLOWANCE = 499_000_000;

    struct Pot {
        address owner;
        string name;
        address token;
        uint32 memberCount;
        uint96 totalShares;
        uint32 round;
        uint128 balance;
        uint128 roundPool;
        bool roundOpen;
    }

    uint256 public potCount;
    mapping(uint256 => Pot) public pots;
    mapping(uint256 => mapping(uint32 => address)) public memberAt;
    mapping(uint256 => mapping(address => uint96)) public shareOf;
    mapping(uint256 => mapping(uint32 => mapping(address => bool))) public paid;
    mapping(address => uint256) public volumeOf;

    event PotCreated(uint256 indexed id, address indexed owner, address indexed token, string name);
    event Funded(uint256 indexed id, address indexed from, uint256 amount, uint256 fee);
    event Withdrawn(uint256 indexed id, address indexed to, uint256 amount);
    event RoundOpened(uint256 indexed id, uint32 round, uint256 pool);
    event Paid(uint256 indexed id, uint32 round, address indexed member, uint256 amount);
    event RoundClosed(uint256 indexed id, uint32 nextRound);

    error BadLength();
    error TooMany();
    error ZeroAddress();
    error ZeroShare();
    error Duplicate();
    error UnknownPot();
    error NotOwner();
    error Empty();
    error RoundAlreadyOpen();
    error AlreadyPaid();
    error NotMember();
    error TransferFailed();
    error UnpaidMembers();
    error RoundNotOpen();
    error BadToken();

    constructor(address usdc_, address eurc_, address feeWallet_) {
        if (usdc_ == address(0) || eurc_ == address(0) || feeWallet_ == address(0)) revert ZeroAddress();
        usdc = IERC20(usdc_);
        eurc = IERC20(eurc_);
        feeWallet = feeWallet_;
    }

    function quote(address owner, uint256 amount) public view returns (uint256 fee, uint256 total) {
        uint256 vol = volumeOf[owner];
        uint256 remaining = vol >= FREE_ALLOWANCE ? 0 : FREE_ALLOWANCE - vol;
        uint256 taxable = amount > remaining ? amount - remaining : 0;
        fee = (taxable * FEE_BPS) / 10_000;
        total = amount + fee;
    }

    function createPot(
        string calldata name,
        address token,
        address[] calldata members,
        uint96[] calldata shares
    ) external returns (uint256 id) {
        if (token != address(usdc) && token != address(eurc)) revert BadToken();
        if (members.length == 0 || members.length != shares.length) revert BadLength();
        if (members.length > 32) revert TooMany();
        id = ++potCount;
        uint96 totalShares;
        for (uint256 i; i < members.length; ++i) {
            if (members[i] == address(0)) revert ZeroAddress();
            if (shares[i] == 0) revert ZeroShare();
            if (shareOf[id][members[i]] != 0) revert Duplicate();
            shareOf[id][members[i]] = shares[i];
            memberAt[id][uint32(i)] = members[i];
            totalShares += shares[i];
        }
        pots[id] = Pot({
            owner: msg.sender,
            name: name,
            token: token,
            memberCount: uint32(members.length),
            totalShares: totalShares,
            round: 1,
            balance: 0,
            roundPool: 0,
            roundOpen: false
        });
        emit PotCreated(id, msg.sender, token, name);
    }

    function fund(uint256 id, uint256 amount) external {
        Pot storage p = pots[id];
        if (p.owner == address(0)) revert UnknownPot();
        if (amount == 0) revert Empty();
        (uint256 fee, ) = quote(msg.sender, amount);
        if (!IERC20(p.token).transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        if (fee > 0 && !IERC20(p.token).transferFrom(msg.sender, feeWallet, fee)) revert TransferFailed();
        volumeOf[msg.sender] += amount;
        p.balance += uint128(amount);
        emit Funded(id, msg.sender, amount, fee);
    }

    function withdraw(uint256 id) external {
        Pot storage p = pots[id];
        if (p.owner == address(0)) revert UnknownPot();
        if (msg.sender != p.owner) revert NotOwner();
        if (p.roundOpen) revert RoundAlreadyOpen();
        uint256 amount = p.balance;
        if (amount == 0) revert Empty();
        p.balance = 0;
        if (!IERC20(p.token).transfer(msg.sender, amount)) revert TransferFailed();
        emit Withdrawn(id, msg.sender, amount);
    }

    function openRound(uint256 id) public {
        Pot storage p = pots[id];
        if (msg.sender != p.owner) revert NotOwner();
        if (p.roundOpen) revert RoundAlreadyOpen();
        if (p.balance == 0) revert Empty();
        p.roundOpen = true;
        p.roundPool = p.balance;
        emit RoundOpened(id, p.round, p.roundPool);
    }

    function pay(uint256 id, address member) public {
        Pot storage p = pots[id];
        if (msg.sender != p.owner) revert NotOwner();
        if (!p.roundOpen) openRound(id);
        uint96 sh = shareOf[id][member];
        if (sh == 0) revert NotMember();
        if (paid[id][p.round][member]) revert AlreadyPaid();
        uint256 amount = (uint256(p.roundPool) * sh) / p.totalShares;
        paid[id][p.round][member] = true;
        p.balance -= uint128(amount);
        if (!IERC20(p.token).transfer(member, amount)) revert TransferFailed();
        emit Paid(id, p.round, member, amount);
    }

    function payAll(uint256 id) external {
        Pot storage p = pots[id];
        if (msg.sender != p.owner) revert NotOwner();
        if (!p.roundOpen) openRound(id);
        for (uint32 i; i < p.memberCount; ++i) {
            address m = memberAt[id][i];
            if (!paid[id][p.round][m]) pay(id, m);
        }
        _closeIfDone(id);
    }

    function closeRound(uint256 id) external {
        Pot storage p = pots[id];
        if (msg.sender != p.owner) revert NotOwner();
        if (!p.roundOpen) revert RoundNotOpen();
        if (!_allPaid(id)) revert UnpaidMembers();
        p.roundOpen = false;
        p.round += 1;
        p.roundPool = 0;
        emit RoundClosed(id, p.round);
    }

    function membersOf(uint256 id)
        external
        view
        returns (address[] memory list, uint96[] memory shares_, bool[] memory paid_)
    {
        Pot storage p = pots[id];
        list = new address[](p.memberCount);
        shares_ = new uint96[](p.memberCount);
        paid_ = new bool[](p.memberCount);
        for (uint32 i; i < p.memberCount; ++i) {
            address m = memberAt[id][i];
            list[i] = m;
            shares_[i] = shareOf[id][m];
            paid_[i] = paid[id][p.round][m];
        }
    }

    function _allPaid(uint256 id) internal view returns (bool) {
        Pot storage p = pots[id];
        for (uint32 i; i < p.memberCount; ++i) {
            if (!paid[id][p.round][memberAt[id][i]]) return false;
        }
        return true;
    }

    function _closeIfDone(uint256 id) internal {
        if (_allPaid(id)) {
            Pot storage p = pots[id];
            p.roundOpen = false;
            p.round += 1;
            p.roundPool = 0;
            emit RoundClosed(id, p.round);
        }
    }
}
