pragma solidity 0.5.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DummyToken is ERC20 {
    constructor() public {
        _mint(msg.sender, 100 ether);
    }
}