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

// 如果未安装钱包则禁用连接钱包按钮
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

    // Connect to Solana 主网
    await solana.connect();
    payer = { publicKey: solana.publicKey };

    // 使用 Ankr 提供的免费 RPC 服务
    connection = new solanaWeb3.Connection("https://rpc.ankr.com/solana", 'confirmed');

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

mintButton.addEventListener('click', async () => {
  const amount = parseInt(amountInput.value);
  const recipientPublicKey = '2wdjheNt1g6RHQqt4mm12oNt6PX4w53S1ivry31Gm6PD'; // 替换为实际接收方地址
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

    // 获取最新的 blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;

    // 设置手续费支付者
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
