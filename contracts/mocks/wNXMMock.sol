pragma solidity 0.5.17;

import "../wNXM.sol";


contract wNXMMock is wNXM {
    uint256 public chainId;
    uint256 public fakeTimestamp;

    constructor(INXM _nxm) public wNXM(_nxm) {}

    function setChainId(uint256 _chainId) public {
        chainId = _chainId;
    }

    function chainID() public view returns (uint256) {
        return chainId;
    }

    function setFaketimestamp(uint256 _fakeTimestamp) public {
        fakeTimestamp = _fakeTimestamp;
    }

    function timestamp() public view returns (uint256) {
        return fakeTimestamp;
    }
}
