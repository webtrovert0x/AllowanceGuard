// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/**
 * @title AllowanceGuard
 * @notice On-chain security guard for ERC-20 token approval audits on Bohr Testnet.
 * @dev Records approval checks on-chain to maintain an immutable audit trail of checked spenders,
 *      detects unlimited allowances (>= 2^255), and provides unified inspection view functions.
 */
contract AllowanceGuard {
    // Threshold above which an allowance is considered unlimited (2^255)
    uint256 public constant UNLIMITED_THRESHOLD = 2**255;

    struct CheckRecord {
        address token;
        address spender;
        uint256 allowanceAmount;
        bool isUnlimited;
        uint256 timestamp;
    }

    struct TokenDetails {
        uint256 allowance;
        uint256 balance;
        uint8 decimals;
        string symbol;
        string name;
        bool isUnlimited;
    }

    // Mapping: user address => array of their allowance check records
    mapping(address => CheckRecord[]) private _userChecks;

    // Total checks recorded globally across all users
    uint256 public totalChecksRecorded;

    // Emitted when a user checks and logs an allowance
    event AllowanceChecked(
        address indexed user,
        address indexed token,
        address indexed spender,
        uint256 allowanceAmount,
        bool isUnlimited,
        uint256 timestamp
    );

    /**
     * @notice Records an allowance check for a given token and spender.
     * @param token The ERC-20 token contract address.
     * @param spender The spender address being inspected.
     * @return currentAllowance The current allowance granted by msg.sender to spender.
     * @return isUnlimited True if allowance is greater than or equal to 2^255.
     */
    function recordCheck(address token, address spender)
        external
        returns (uint256 currentAllowance, bool isUnlimited)
    {
        require(token != address(0), "AllowanceGuard: Invalid token address");
        require(spender != address(0), "AllowanceGuard: Invalid spender address");

        currentAllowance = IERC20(token).allowance(msg.sender, spender);
        isUnlimited = (currentAllowance >= UNLIMITED_THRESHOLD);

        CheckRecord memory record = CheckRecord({
            token: token,
            spender: spender,
            allowanceAmount: currentAllowance,
            isUnlimited: isUnlimited,
            timestamp: block.timestamp
        });

        _userChecks[msg.sender].push(record);
        totalChecksRecorded += 1;

        emit AllowanceChecked(
            msg.sender,
            token,
            spender,
            currentAllowance,
            isUnlimited,
            block.timestamp
        );

        return (currentAllowance, isUnlimited);
    }

    /**
     * @notice Batch records multiple allowance checks in a single transaction.
     * @param tokens Array of ERC-20 token addresses.
     * @param spenders Array of corresponding spender addresses.
     */
    function batchRecordChecks(
        address[] calldata tokens,
        address[] calldata spenders
    ) external {
        require(
            tokens.length == spenders.length,
            "AllowanceGuard: Length mismatch between tokens and spenders"
        );
        require(tokens.length > 0, "AllowanceGuard: Empty arrays");

        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            address spender = spenders[i];

            require(token != address(0), "AllowanceGuard: Invalid token address");
            require(spender != address(0), "AllowanceGuard: Invalid spender address");

            uint256 currentAllowance = IERC20(token).allowance(msg.sender, spender);
            bool isUnlimited = (currentAllowance >= UNLIMITED_THRESHOLD);

            CheckRecord memory record = CheckRecord({
                token: token,
                spender: spender,
                allowanceAmount: currentAllowance,
                isUnlimited: isUnlimited,
                timestamp: block.timestamp
            });

            _userChecks[msg.sender].push(record);

            emit AllowanceChecked(
                msg.sender,
                token,
                spender,
                currentAllowance,
                isUnlimited,
                block.timestamp
            );
        }

        totalChecksRecorded += tokens.length;
    }

    /**
     * @notice Helper view function to inspect all token metadata and allowance in one round trip.
     * @param user The owner address to check.
     * @param token The ERC-20 token address.
     * @param spender The spender address.
     */
    function getAllowanceDetails(
        address user,
        address token,
        address spender
    ) external view returns (TokenDetails memory details) {
        require(token != address(0), "AllowanceGuard: Invalid token address");
        require(user != address(0), "AllowanceGuard: Invalid user address");

        details.allowance = IERC20(token).allowance(user, spender);
        details.balance = IERC20(token).balanceOf(user);
        details.isUnlimited = (details.allowance >= UNLIMITED_THRESHOLD);

        // Fetch optional metadata safely
        try IERC20Metadata(token).decimals() returns (uint8 dec) {
            details.decimals = dec;
        } catch {
            details.decimals = 18;
        }

        try IERC20Metadata(token).symbol() returns (string memory sym) {
            details.symbol = sym;
        } catch {
            details.symbol = "UNKNOWN";
        }

        try IERC20Metadata(token).name() returns (string memory n) {
            details.name = n;
        } catch {
            details.name = "Unknown Token";
        }

        return details;
    }

    /**
     * @notice Returns the total count of checks performed by a specific user.
     * @param user The address of the user.
     */
    function getUserCheckCount(address user) external view returns (uint256) {
        return _userChecks[user].length;
    }

    /**
     * @notice Returns paginated check history for a user.
     * @param user The address of the user.
     * @param offset Starting index.
     * @param limit Maximum records to return.
     */
    function getUserChecks(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (CheckRecord[] memory) {
        uint256 total = _userChecks[user].length;
        if (offset >= total) {
            return new CheckRecord[](0);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        uint256 resultSize = end - offset;
        CheckRecord[] memory result = new CheckRecord[](resultSize);

        for (uint256 i = 0; i < resultSize; i++) {
            result[i] = _userChecks[user][offset + i];
        }

        return result;
    }
}
