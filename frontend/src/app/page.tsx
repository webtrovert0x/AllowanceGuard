"use client";

import React, { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { parseAbi, formatUnits, isAddress } from "viem";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  XCircle,
  Zap,
  Fuel,
  History,
  FileCheck2,
} from "lucide-react";
import AllowanceGuardArtifact from "@/contracts/AllowanceGuard.json";

// Standard ERC-20 ABI
const ERC20_ABI = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL || "https://scan.bohr.life";
// Deployed AllowanceGuard on Bohr Testnet
const GUARD_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0xa2dE1360664eCfA02eb0Dd4B35281bd64A871f03") as `0x${string}`;

interface CheckRecordItem {
  token: string;
  spender: string;
  allowanceAmount: bigint;
  isUnlimited: boolean;
  timestamp: bigint;
}

export default function Home() {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();

  const [tokenAddress, setTokenAddress] = useState("");
  const [spenderAddress, setSpenderAddress] = useState("");
  // Allowance display is LOCKED until the check transaction confirms on-chain and pays gas
  const [checkConfirmed, setCheckConfirmed] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isErrorStatus, setIsErrorStatus] = useState(false);

  const isValidToken = isAddress(tokenAddress);
  const isValidSpender = isAddress(spenderAddress);
  const hasGuardContract = isAddress(GUARD_CONTRACT_ADDRESS);

  // Read Token Metadata & Allowance (enabled ONLY after gas transaction confirms)
  const { data: symbol } = useReadContract({
    address: isValidToken ? (tokenAddress as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: { enabled: isValidToken && checkConfirmed },
  });

  const { data: decimals } = useReadContract({
    address: isValidToken ? (tokenAddress as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: isValidToken && checkConfirmed },
  });

  const { data: userBalance } = useReadContract({
    address: isValidToken ? (tokenAddress as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: isValidToken && Boolean(address) && checkConfirmed },
  });

  const {
    data: allowance,
    refetch: refetchAllowance,
    isLoading: isCheckingAllowance,
  } = useReadContract({
    address: isValidToken ? (tokenAddress as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && isValidSpender ? [address, spenderAddress as `0x${string}`] : undefined,
    query: { enabled: isValidToken && isValidSpender && Boolean(address) && checkConfirmed },
  });

  // Read User's On-Chain Audit History from AllowanceGuard
  const {
    data: userHistory,
    refetch: refetchHistory,
  } = useReadContract({
    address: hasGuardContract ? GUARD_CONTRACT_ADDRESS : undefined,
    abi: AllowanceGuardArtifact.abi,
    functionName: "getUserChecks",
    args: address ? [address, BigInt(0), BigInt(10)] : undefined,
    query: { enabled: hasGuardContract && Boolean(address) },
  });

  // Transaction 1: Record Check on AllowanceGuard contract (Costs Gas!)
  const {
    writeContract: writeRecordCheck,
    data: recordTxHash,
    isPending: isRecording,
    error: recordError,
  } = useWriteContract();

  const { isLoading: isWaitingRecord, isSuccess: isRecordSuccess } =
    useWaitForTransactionReceipt({ hash: recordTxHash });

  // Transaction 2: Revoke Approval (calls ERC20 approve(spender, 0), Costs Separate Gas!)
  const {
    writeContract: writeApprove,
    data: revokeTxHash,
    isPending: isRevoking,
    error: revokeError,
  } = useWriteContract();

  const { isLoading: isWaitingRevoke, isSuccess: isRevokeSuccess } =
    useWaitForTransactionReceipt({ hash: revokeTxHash });

  // When Check Transaction successfully confirms on-chain (Gas Paid!):
  useEffect(() => {
    if (isRecordSuccess) {
      setCheckConfirmed(true);
      refetchAllowance();
      refetchHistory();
      setIsErrorStatus(false);
      setStatusMessage("✅ Check transaction confirmed on Bohr Testnet! Gas fee paid. Results revealed below.");
    }
  }, [isRecordSuccess, refetchAllowance, refetchHistory]);

  // When Revoke Transaction successfully confirms on-chain:
  useEffect(() => {
    if (isRevokeSuccess) {
      refetchAllowance();
      refetchHistory();
      setIsErrorStatus(false);
      setStatusMessage("✅ Approval successfully revoked to 0! Gas fee paid on Bohr Testnet.");
    }
  }, [isRevokeSuccess, refetchAllowance, refetchHistory]);

  // Catch wallet rejections or gas errors
  useEffect(() => {
    if (recordError) {
      setIsErrorStatus(true);
      setStatusMessage(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (recordError as any)?.shortMessage || "Check transaction rejected in wallet. Gas fee is required to execute the check."
      );
    }
  }, [recordError]);

  useEffect(() => {
    if (revokeError) {
      setIsErrorStatus(true);
      setStatusMessage(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (revokeError as any)?.shortMessage || "Revocation transaction rejected in wallet."
      );
    }
  }, [revokeError]);

  // Action: Check Allowance -> REQUIRES ON-CHAIN TRANSACTION WITH GAS FEE
  const handleCheck = () => {
    if (!isConnected) {
      open();
      return;
    }
    if (!isValidToken || !isValidSpender) {
      alert("Please enter valid addresses for both Token and Spender.");
      return;
    }

    setCheckConfirmed(false);
    setIsErrorStatus(false);
    setStatusMessage("Please confirm the check transaction in your wallet to pay the gas fee...");

    // Submit state-changing transaction to AllowanceGuard contract
    writeRecordCheck({
      address: GUARD_CONTRACT_ADDRESS,
      abi: AllowanceGuardArtifact.abi,
      functionName: "recordCheck",
      args: [tokenAddress as `0x${string}`, spenderAddress as `0x${string}`],
    });
  };

  // Action: Revoke -> REQUIRES SEPARATE TRANSACTION WITH GAS FEE
  const handleRevoke = () => {
    if (!address || !isValidToken || !isValidSpender) return;
    setIsErrorStatus(false);
    setStatusMessage("Please confirm the revocation transaction in your wallet to reset allowance to 0 (requires gas)...");
    writeApprove({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spenderAddress as `0x${string}`, BigInt(0)],
    });
  };

  const dec = typeof decimals === "number" ? decimals : 18;
  const tokenSymbol = typeof symbol === "string" ? symbol : "";
  const isUnlimited = allowance !== undefined && (allowance as bigint) >= BigInt(2) ** BigInt(255);
  const isZero = allowance === undefined || (allowance as bigint) === BigInt(0);
  const formattedAllowance =
    allowance !== undefined
      ? isUnlimited
        ? "Unlimited (Max uint256)"
        : formatUnits(allowance as bigint, dec)
      : null;

  const formattedBalance =
    userBalance !== undefined ? formatUnits(userBalance as bigint, dec) : null;

  const historyRecords = Array.isArray(userHistory)
    ? (userHistory as unknown as CheckRecordItem[])
    : [];

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="logo-group">
          <img
            src="/logo.png"
            alt="AllowanceGuard Logo"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              objectFit: "cover",
              boxShadow: "0 0 15px rgba(0, 240, 255, 0.4)",
              border: "1px solid rgba(0, 240, 255, 0.3)"
            }}
          />
          <div>
            <div className="logo-title">AllowanceGuard</div>
            <div className="network-badge">
              <span className="network-pulse"></span>
              Bohr Testnet (Chain ID: 968)
            </div>
          </div>
        </div>

        <div>
          <button
            className="btn-primary"
            style={{ width: "auto", padding: "0.6rem 1.25rem", fontSize: "0.9rem" }}
            onClick={() => open()}
          >
            {isConnected && address
              ? `${address.slice(0, 6)}...${address.slice(-4)}`
              : "Connect Wallet"}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <h1>
          Token Approval Checker &amp; <span>Audit Guard</span>
        </h1>
        <p>
          Inspect which smart contracts have permission to spend your tokens on Bohr Testnet.
          Record checks on-chain through a verifiable transaction, and revoke dangerous
          unlimited approvals with 1 click.
        </p>
      </section>

      {/* Gas Fee Notice Banner */}
      <div className="info-banner" style={{ borderColor: "rgba(0, 240, 255, 0.3)" }}>
        <Fuel size={22} color="#00f0ff" style={{ flexShrink: 0, marginTop: "2px" }} />
        <div>
          <strong>Gas Fee Architecture:</strong>
          <ul style={{ paddingLeft: "1.2rem", marginTop: "0.4rem", lineHeight: 1.6 }}>
            <li>
              <strong>Checking an allowance requires gas:</strong> Clicking <em>Check Allowance</em> submits a transaction to <code>AllowanceGuard.recordCheck()</code> on Bohr Testnet to record your audit on-chain before displaying results.
            </li>
            <li>
              <strong>Revoking requires its own gas fee:</strong> Calling <code>approve(spender, 0)</code> directly on the ERC-20 contract is a separate transaction with its own gas fee.
            </li>
          </ul>
        </div>
      </div>

      {/* Main Inspection Card */}
      <div className="glass-card">
        <div className="form-group">
          <label className="label">
            <span>ERC-20 Token Address</span>
            {isValidToken && <span style={{ color: "var(--status-safe)" }}>✓ Valid Address</span>}
          </label>
          <div className="input-wrapper">
            <input
              type="text"
              placeholder="0x... (Token Contract on Bohr Testnet)"
              className="input-field"
              value={tokenAddress}
              onChange={(e) => {
                setTokenAddress(e.target.value.trim());
                setCheckConfirmed(false);
              }}
            />
          </div>
          <div className="preset-pills">
            <button
              type="button"
              className="pill-btn"
              onClick={() => {
                setTokenAddress("0xeAF13A23013d0D541f2De76625F562Ca858Fe7D4");
                setCheckConfirmed(false);
              }}
            >
              ⚡ Test Token (BGUSD: 0xeAF1...e7D4)
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="label">
            <span>Spender Address (DEX / Router / Protocol)</span>
            {isValidSpender && <span style={{ color: "var(--status-safe)" }}>✓ Valid Address</span>}
          </label>
          <div className="input-wrapper">
            <input
              type="text"
              placeholder="0x... (Spender Address to audit)"
              className="input-field"
              value={spenderAddress}
              onChange={(e) => {
                setSpenderAddress(e.target.value.trim());
                setCheckConfirmed(false);
              }}
            />
          </div>
          <div className="preset-pills">
            <button
              type="button"
              className="pill-btn"
              onClick={() => {
                setSpenderAddress("0xa2dE1360664eCfA02eb0Dd4B35281bd64A871f03");
                setCheckConfirmed(false);
              }}
            >
              🛡️ AllowanceGuard Spender (0xa2dE...1f03)
            </button>
            <button
              type="button"
              className="pill-btn"
              onClick={() => {
                setSpenderAddress("0x000000000000000000000000000000000000dEaD");
                setCheckConfirmed(false);
              }}
            >
              🔥 Burner Spender
            </button>
          </div>
        </div>

        {/* Check Allowance Button (Explicitly requires gas transaction) */}
        <button
          className="btn-primary"
          onClick={handleCheck}
          disabled={isRecording || isWaitingRecord}
        >
          {isRecording ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              Confirm in Wallet (Sign Gas Fee)...
            </>
          ) : isWaitingRecord ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              Mining Check on Bohr Testnet...
            </>
          ) : (
            <>
              <Zap size={18} />
              Check Allowance (Requires Gas Fee)
            </>
          )}
        </button>

        {/* Live Status / Transaction Feedback Banner */}
        {statusMessage && (
          <div
            style={{
              marginTop: "1.25rem",
              padding: "0.85rem 1rem",
              borderRadius: "8px",
              background: isErrorStatus ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
              border: `1px solid ${isErrorStatus ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
              color: isErrorStatus ? "var(--status-danger)" : "var(--status-safe)",
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            {isErrorStatus ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Results Area — UNLOCKED ONLY AFTER GAS TRANSACTION MINES */}
        {checkConfirmed && allowance !== undefined ? (
          <div className="result-box">
            <div className="result-row">
              <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Approval Security Level
              </span>
              <div>
                {isUnlimited ? (
                  <span className="badge badge-danger">
                    <AlertTriangle size={14} />
                    Unlimited Allowance (High Risk)
                  </span>
                ) : isZero ? (
                  <span className="badge badge-safe">
                    <CheckCircle size={14} />
                    Safe (0 Allowance)
                  </span>
                ) : (
                  <span className="badge badge-warning">
                    <AlertTriangle size={14} />
                    Capped Allowance
                  </span>
                )}
              </div>
            </div>

            <div className="result-row">
              <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Token
              </span>
              <span style={{ fontWeight: 600 }}>
                {tokenSymbol || "ERC-20 Token"} (Decimals: {dec})
              </span>
            </div>

            {formattedBalance !== null && (
              <div className="result-row">
                <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  Your Balance
                </span>
                <span>
                  {formattedBalance} {tokenSymbol}
                </span>
              </div>
            )}

            <div className="result-row">
              <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Approved Amount
              </span>
              <span
                style={{
                  fontFamily: "var(--font-geist-mono)",
                  fontWeight: 700,
                  color: isUnlimited
                    ? "var(--status-danger)"
                    : isZero
                    ? "var(--status-safe)"
                    : "var(--status-warning)",
                }}
              >
                {formattedAllowance} {tokenSymbol}
              </span>
            </div>

            <div className="result-row">
              <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Spender on BohrScan
              </span>
              <a
                href={`${EXPLORER_URL}/address/${spenderAddress}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  color: "var(--accent-cyan)",
                  fontSize: "0.85rem",
                  textDecoration: "underline",
                }}
              >
                View Spender <ExternalLink size={14} />
              </a>
            </div>

            {/* Revoke Action (Separate Gas Transaction) */}
            {!isZero && (
              <div style={{ marginTop: "1.5rem" }}>
                <button
                  className="btn-danger"
                  style={{ width: "100%" }}
                  onClick={handleRevoke}
                  disabled={isRevoking || isWaitingRevoke}
                >
                  <XCircle size={18} />
                  {isRevoking ? (
                    "Confirming in Wallet (Separate Gas Fee)..."
                  ) : isWaitingRevoke ? (
                    "Mining Revocation on Bohr Testnet..."
                  ) : (
                    "Revoke Approval (Costs Gas Fee)"
                  )}
                </button>
              </div>
            )}

            {/* Transaction Hashes */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem" }}>
              {recordTxHash && (
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Check Transaction (Gas Paid):{" "}
                  <a
                    href={`${EXPLORER_URL}/tx/${recordTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--accent-cyan)", textDecoration: "underline" }}
                  >
                    {recordTxHash.slice(0, 10)}...{recordTxHash.slice(-8)}{" "}
                    <ExternalLink size={12} style={{ display: "inline" }} />
                  </a>
                </div>
              )}
              {revokeTxHash && (
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Revocation Transaction (Gas Paid):{" "}
                  <a
                    href={`${EXPLORER_URL}/tx/${revokeTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--accent-cyan)", textDecoration: "underline" }}
                  >
                    {revokeTxHash.slice(0, 10)}...{revokeTxHash.slice(-8)}{" "}
                    <ExternalLink size={12} style={{ display: "inline" }} />
                  </a>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* On-Chain Audit History Section */}
      {hasGuardContract && historyRecords.length > 0 ? (
        <section className="history-section">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
            <History size={20} color="#00f0ff" />
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>
              Your On-Chain Check Audit Trail
            </h2>
          </div>

          <div className="glass-card" style={{ padding: "0.5rem 1rem", overflowX: "auto" }}>
            <table className="history-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Spender</th>
                  <th>Allowance</th>
                  <th>Risk Level</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {historyRecords.map((rec, idx) => (
                  <tr key={idx}>
                    <td style={{ fontFamily: "var(--font-geist-mono)", fontSize: "0.85rem" }}>
                      <a
                        href={`${EXPLORER_URL}/address/${rec.token}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "var(--accent-cyan)", textDecoration: "underline" }}
                      >
                        {rec.token.slice(0, 6)}...{rec.token.slice(-4)}
                      </a>
                    </td>
                    <td style={{ fontFamily: "var(--font-geist-mono)", fontSize: "0.85rem" }}>
                      <a
                        href={`${EXPLORER_URL}/address/${rec.spender}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "var(--accent-cyan)", textDecoration: "underline" }}
                      >
                        {rec.spender.slice(0, 6)}...{rec.spender.slice(-4)}
                      </a>
                    </td>
                    <td style={{ fontFamily: "var(--font-geist-mono)", fontSize: "0.85rem" }}>
                      {rec.isUnlimited ? "Unlimited" : rec.allowanceAmount.toString()}
                    </td>
                    <td>
                      {rec.isUnlimited ? (
                        <span className="badge badge-danger">Unlimited</span>
                      ) : rec.allowanceAmount === BigInt(0) ? (
                        <span className="badge badge-safe">Safe</span>
                      ) : (
                        <span className="badge badge-warning">Capped</span>
                      )}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      {new Date(Number(rec.timestamp) * 1000).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* Security Educational Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1.5rem",
          marginTop: "3rem",
        }}
      >
        <div className="glass-card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <AlertTriangle size={20} color="#f59e0b" />
            <h3 style={{ fontSize: "1.1rem" }}>Why Unlimited Approvals are Risky</h3>
          </div>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            When you grant an unlimited allowance, the smart contract retains permanent permission
            to withdraw tokens from your wallet. If the spender smart contract is upgraded, compromised,
            or suffers an exploit, all approved tokens can be swept instantly.
          </p>
        </div>

        <div className="glass-card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <FileCheck2 size={20} color="#10b981" />
            <h3 style={{ fontSize: "1.1rem" }}>Gas Fees &amp; On-Chain Verification</h3>
          </div>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            The allowance check incurs a small gas fee on Bohr Testnet to write the audit record into
            <code>AllowanceGuard</code>. If you decide to revoke, submitting <code>approve(spender, 0)</code>{" "}
            requires its own separate transaction and gas fee.
          </p>
        </div>
      </div>
    </div>
  );
}
