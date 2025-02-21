// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SwapLedger {
    struct Swap {
        address trader;      // The address that executed the swap
        address tokenIn;     // The token swapped from (use address(0) for ETH)
        uint256 amountIn;    // Amount of tokenIn swapped
        address tokenOut;    // The token swapped to
        uint256 amountOut;   // Amount of tokenOut received
        uint256 timestamp;   // Timestamp when the swap was recorded
    }

    Swap[] public swaps;

    event SwapRecorded(
        uint256 indexed swapId,
        address indexed trader,
        address indexed tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOut,
        uint256 timestamp
    );

    /**
     * @notice Record a swap on the ledger. Use this for non-ETH swaps or when you want to specify all details.
     * @param tokenIn The token being swapped from (use address(0) for ETH).
     * @param amountIn The amount of tokenIn swapped.
     * @param tokenOut The token being swapped to.
     * @param amountOut The amount of tokenOut received.
     */
    function addSwap(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOut
    ) external {
        Swap memory newSwap = Swap({
            trader: msg.sender,
            tokenIn: tokenIn,
            amountIn: amountIn,
            tokenOut: tokenOut,
            amountOut: amountOut,
            timestamp: block.timestamp
        });
        swaps.push(newSwap);
        uint256 swapId = swaps.length - 1;
        emit SwapRecorded(swapId, msg.sender, tokenIn, amountIn, tokenOut, amountOut, block.timestamp);
    }

    /**
     * @notice A payable function to receive ETH and record a swap.
     * @param tokenOut The token being swapped to.
     * @param amountOut The amount of tokenOut expected.
     *
     * The sent ETH (msg.value) is recorded as the swap's input.
     */
    function receiveSwap(address tokenOut, uint256 amountOut) external payable {
        require(msg.value > 0, "No ETH sent");

        Swap memory newSwap = Swap({
            trader: msg.sender,
            tokenIn: address(0), // Address(0) to represent ETH
            amountIn: msg.value,
            tokenOut: tokenOut,
            amountOut: amountOut,
            timestamp: block.timestamp
        });
        swaps.push(newSwap);
        uint256 swapId = swaps.length - 1;
        emit SwapRecorded(swapId, msg.sender, address(0), msg.value, tokenOut, amountOut, block.timestamp);
    }

    /**
     * @notice Returns the total number of swaps recorded.
     * @return The count of swaps.
     */
    function getSwapCount() external view returns (uint256) {
        return swaps.length;
    }

    /**
     * @notice Returns the swap details at a specific index.
     * @param index The index of the swap in the ledger.
     * @return The swap details.
     */
    function getSwap(uint256 index) external view returns (Swap memory) {
        require(index < swaps.length, "Swap index out of bounds");
        return swaps[index];
    }

    /**
     * @notice Returns the full list of swaps.
     * @return An array of all swap records.
     */
    function getAllSwaps() external view returns (Swap[] memory) {
        return swaps;
    }
    
    // a fallback receive function in case ETH is sent directly to the contract.
    receive() external payable {
        Swap memory newSwap = Swap({
            trader: msg.sender,
            tokenIn: address(0),
            amountIn: msg.value,
            tokenOut: address(0),
            amountOut: 0,
            timestamp: block.timestamp
        });
        swaps.push(newSwap);
        uint256 swapId = swaps.length - 1;
        emit SwapRecorded(swapId, msg.sender, address(0), msg.value, address(0), 0, block.timestamp);
    }
}
