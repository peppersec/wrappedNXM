pragma solidity 0.5.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "./INXM.sol";
import "./ERC20Permit.sol";


contract wNXM is ERC20, ERC20Detailed, ERC20Permit {
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 value,
        bytes data
    );

    INXM public NXM;

    constructor(INXM _nxm) public ERC20Detailed("Wrapped NXM", "wNXM", 18) {
        NXM = _nxm;
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

    function unwrapTo(uint256 _amount, address _to) external {
        _burn(msg.sender, _amount);
        require(NXM.transfer(_to, _amount), "wNXM: transfer failed");
    }

    function canWrap(address _owner, uint256 _amount)
        public
        view
        returns (bool success, string memory reason)
    {
        if (NXM.allowance(_owner, address(this)) < _amount) {
            return (false, "insufficient allowance");
        }

        if (NXM.balanceOf(_owner) < _amount) {
            return (false, "insufficient NXM balance");
        }

        if (NXM.isLockedForMV(_owner) > now) {
            return (false, "NXM balance lockedForMv");
        }

        if (!NXM.whiteListed(address(this))) {
            return (false, "wNXM is not whitelisted");
        }

        return (true, "");
    }

    function canUnwrap(address _owner, address _recipient, uint256 _amount)
        public
        view
        returns (bool success, string memory reason)
    {
        if (balanceOf(_owner) < _amount) {
            return (false, "insufficient wNXM balance");
        }

        if (!NXM.whiteListed(_recipient)) {
            return (false, "recipient is not whitelisted");
        }

        if (NXM.isLockedForMV(address(this)) > now) {
            return (false, "wNXM is lockedForMv");
        }

        return (true, "");
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
}
