// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title TestUSD
 * @dev Test stablecoin for Movement Network testnet with ERC-2612 permit support
 * Enables gasless approvals for x402 facilitator pattern
 * Anyone can mint tokens for testing purposes
 */
contract TestUSD is ERC20, ERC20Burnable, ERC20Permit {
    uint256 public constant MINT_AMOUNT = 1000 * 10**18; // 1000 TUSD per mint
    uint256 public constant MAX_MINT_PER_ADDRESS = 10000 * 10**18; // Max 10000 TUSD per address

    mapping(address => uint256) public mintedAmount;

    event Minted(address indexed to, uint256 amount);

    constructor() ERC20("Test USD", "TUSD") ERC20Permit("Test USD") {
        // Mint initial supply to deployer
        _mint(msg.sender, 100000 * 10**18);
    }

    /**
     * @dev Anyone can mint test tokens
     * Limited to prevent abuse
     */
    function mint() external {
        require(
            mintedAmount[msg.sender] + MINT_AMOUNT <= MAX_MINT_PER_ADDRESS,
            "TestUSD: Max mint limit reached"
        );

        mintedAmount[msg.sender] += MINT_AMOUNT;
        _mint(msg.sender, MINT_AMOUNT);

        emit Minted(msg.sender, MINT_AMOUNT);
    }

    /**
     * @dev Mint specific amount (for testing flexibility)
     * @param amount Amount to mint (in wei)
     */
    function mintAmount(uint256 amount) external {
        require(
            mintedAmount[msg.sender] + amount <= MAX_MINT_PER_ADDRESS,
            "TestUSD: Max mint limit reached"
        );

        mintedAmount[msg.sender] += amount;
        _mint(msg.sender, amount);

        emit Minted(msg.sender, amount);
    }

    /**
     * @dev Check remaining mintable amount for an address
     */
    function remainingMintable(address account) external view returns (uint256) {
        if (mintedAmount[account] >= MAX_MINT_PER_ADDRESS) {
            return 0;
        }
        return MAX_MINT_PER_ADDRESS - mintedAmount[account];
    }

    /**
     * @dev Returns the number of decimals (18 for simplicity)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }

}
