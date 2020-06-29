pragma solidity 0.5.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "./INXM.sol";


contract wNXM is ERC20, ERC20Detailed {
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 value,
        bytes data
    );

    INXM public NXM;

    bytes32 public DOMAIN_SEPARATOR;
    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    mapping(address => uint256) public nonces;

    constructor(INXM _nxm) public ERC20Detailed("wrapped NXM", "wNXM", 18) {
        NXM = _nxm;
        uint256 chainId;
        assembly {
            chainId := chainid
        }
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes(name())),
                keccak256(bytes("1")),
                chainId,
                address(this)
            )
        );
    }

    function wrap(uint256 _amount) external {
        require(
            NXM.transferFrom(msg.sender, address(this), _amount),
            "wNXM: transferFrom failed"
        );
        _mint(msg.sender, _amount);
    }

    function unwrap(uint256 _amount) external {
        _burn(msg.sender, _amount);
        require(NXM.transfer(msg.sender, _amount), "wNXM: transfer failed");
    }

    function unwrapAndTransfer(uint256 _amount, address _to) external {
        _burn(msg.sender, _amount);
        require(NXM.transfer(_to, _amount), "wNXM: transfer failed");
    }

    function canWrap(address _owner, uint256 _amount)
        public
        view
        returns (bool success, string memory reason)
    {
        bool isAllowed = NXM.allowance(_owner, address(this)) >= _amount;
        bool hasBalance = NXM.balanceOf(_owner) >= _amount;
        bool isLockedForMV = NXM.isLockedForMV(_owner) < now;
        bool isWhitelisted = NXM.whiteListed(_owner);
        if (!isAllowed) {
            return (false, "insufficient allowance");
        }
        if (!hasBalance) {
            return (false, "insufficient NXM balance");
        }
        if (!isLockedForMV) {
            return (false, "NXM balance lockedForMv");
        }
        if (!isWhitelisted) {
            return (false, "owner is not whitelisted");
        }
        return (true, "");
    }

    function canUnwrap(address _owner, address _recipient, uint256 _amount)
        public
        view
        returns (bool success, string memory reason)
    {
        bool hasBalance = balanceOf(_owner) >= _amount;
        bool isWhitelisted = NXM.whiteListed(_recipient);
        if (!hasBalance) {
            return (false, "insufficient NXM balance");
        }
        if (!isWhitelisted) {
            return (false, "recipient is not whitelisted");
        }
        return (true, "");
    }

    // https://github.com/ethereum/EIPs/blob/b64013917dd4364d9542e83ca03b23587941c216/EIPS/eip-2612.md
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(deadline >= block.timestamp, "wNXM: permition expired");
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        PERMIT_TYPEHASH,
                        owner,
                        spender,
                        value,
                        nonces[owner]++,
                        deadline
                    )
                )
            )
        );
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(
            recoveredAddress != address(0) && recoveredAddress == owner,
            "wNXM: invalid signature"
        );
        _approve(owner, spender, value);
    }

    function claimTokens(address _token, address payable _to, uint256 _balance)
        external
    {
        require(_token != address(NXM), "wNXM: can't claim NXM");
        require(_token != address(this), "wNXM: can't claim wNXM");
        require(_to != address(0), "wNXM: to is 0");
        if (_token == address(0)) {
            _to.transfer(_balance);
            return;
        }

        ERC20 token = ERC20(_token);
        token.transfer(_to, _balance);
    }

    function transferAndCall(address _to, uint256 _value, bytes calldata _data)
        external
        returns (bool)
    {
        require(transfer(_to, _value), "wNXM: transferAndCall failed");
        emit Transfer(msg.sender, _to, _value, _data);

        if (isContract(_to)) {
            require(
                contractFallback(msg.sender, _to, _value, _data),
                "contractFallback failed"
            );
        }
        return true;
    }

    function transferFromAndCall(
        address _from,
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external returns (bool) {
        require(
            transferFrom(_from, _to, _value),
            "wNXM: transferFromAndCall failed"
        );
        emit Transfer(msg.sender, _to, _value, _data);

        if (isContract(_to)) {
            require(
                contractFallback(_from, _to, _value, _data),
                "contractFallback failed"
            );
        }
        return true;
    }

    function approveAndCall(
        address _spender,
        uint256 _amount,
        bytes calldata _extraData
    ) external returns (bool) {
        require(approve(_spender, _amount), "wNXM: approveAndCall failed");
        (bool success, ) = _spender.call(
            abi.encodeWithSignature(
                "receiveApproval(address,uint256,bytes)",
                _spender,
                _amount,
                _extraData
            )
        );
        return success;
    }

    function isContract(address _addr) private view returns (bool) {
        uint256 length;
        assembly {
            length := extcodesize(_addr)
        }
        return length > 0;
    }

    function contractFallback(
        address _from,
        address _to,
        uint256 _value,
        bytes memory _data
    ) private returns (bool) {
        (bool success, ) = _to.call(
            abi.encodeWithSignature(
                "onTokenTransfer(address,uint256,bytes)",
                _from,
                _value,
                _data
            )
        );
        return success;
    }
}
