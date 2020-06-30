pragma solidity 0.5.17;

import "../wNXM.sol";

contract wNXMMock is wNXM {
    uint256 public chainId;

    constructor(INXM _nxm) public wNXM(_nxm) {}

    function setChainId(uint _chainId) public {
      chainId = _chainId;
    }

    function chainID() public view returns (uint256) {
        return chainId;
    }
}
