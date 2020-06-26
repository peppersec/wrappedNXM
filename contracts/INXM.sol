pragma solidity 0.5.17;


interface INXM {
    function whiteListed(address owner) external view returns (bool);

    function isLockedForMV(address owner) external view returns (uint256);

    function balanceOf(address owner) external view returns (uint256);

    function transfer(address to, uint256 value) external returns (bool);

    function transferFrom(address from, address to, uint256 value)
        external
        returns (bool);

    function allowance(address owner, address spender)
        external
        view
        returns (uint256);
}
