var canvas, ctx, cell;
var gameOver = 1;
var ponder = 0;

const bgImage = new Image();
const blackStoneImage = new Image();
const whiteStoneImage = new Image();
const moveSound = new Audio('./assets/112-2052.wav');
bgImage.src = './assets/board_fox.png';
blackStoneImage.src = './assets/stone_b_fox.png';
whiteStoneImage.src = './assets/stone_w_fox.png';

window.gtpAPI.onOutput((data) => {
  // Analyze
  if (data.includes('move')) {
    drawBoard();
    let oldVisits = 0;
    let oldWinrate = 0;
    let blueMove = 0;
    data.split('info').forEach((i) => {
      try {
        if (blueMove) {
          blueMove = 0;
          return;
        }
        let move = i.split('move ')[1].split(' ')[0];
        let col = 'ABCDEFGHJKLMNOPQRST'.indexOf(move[0]);
        let row = 19-parseInt(move.slice(1));
        winrate = Math.floor(parseFloat(i.split('winrate ')[1].split(' ')[0]) * 100);
        visits = i.split('visits ')[1].split(' ')[0];
        if (visits < 10) return;
        ctx.beginPath();
        ctx.arc(col * cell + cell / 2, row * cell + cell / 2, cell / 2 - 2, 0, 2 * Math.PI);
        ctx.fillStyle = 'lightgreen';
        if (winrate > oldWinrate) {
          blueMove = 1;
          oldWinrate = winrate;
          ctx.fillStyle = 'cyan';
        }
        else if (visits > oldVisits) oldVisits = visits;
        else if (oldVisits > visits && oldWinrate > winrate) ctx.fillStyle = 'orange';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.fillStyle = 'black';
        ctx.font = cell / 3 + 'px Monospace';
        let xOffset = Math.abs(winrate) < 10 ? 4 : 0;
        ctx.fillText(winrate + '%', col * cell + cell / 5 + xOffset, row * cell + cell / 2 + 4);
        ctx.font = cell / 4 + 'px Monospace';
      } catch {}
    });
  }
});

function drawBoard() {
  cell = canvas.width / (size-2);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  for (let i = 0; i < size-2; i++) {
    const x = i * cell + cell / 2;
    const y = i * cell + cell / 2;
    let offset = cell * 2 - cell / 2 - cell;
    ctx.moveTo(offset, y);
    ctx.lineTo(canvas.width - offset, y);
    ctx.moveTo(x, offset);
    ctx.lineTo(x, canvas.height - offset);
  };
  ctx.lineWidth = 1;
  ctx.stroke();
  for (let row = 0; row < size-2; row++) {
    for (let col = 0; col < size-2; col++) {
      let sq = (row+1) * size + (col+1);
      let starPoints = {
         9: [36, 38, 40, 58, 60, 62, 80, 82, 84],
        13: [64, 67, 70, 109, 112, 115, 154, 157, 160],
        19: [88, 94, 100, 214, 220, 226, 340, 346, 352]
      }
      if ([9, 13, 19].includes(size-2) && starPoints[size-2].includes(sq)) {
        ctx.beginPath();
        ctx.arc(col * cell+(cell/4)*2, row * cell +(cell/4)*2, cell / 6 - 2, 0, 2 * Math.PI);
        ctx.fillStyle = 'black';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      if (board[sq] == 7) continue;
      const stoneImage = board[sq] == 1 ? blackStoneImage : whiteStoneImage;
      if (board[sq]) {
        ctx.drawImage(
          stoneImage,
          col * cell + cell / 2 - cell / 2,
          row * cell + cell / 2 - cell / 2,
          cell,
          cell
        );
      }
      
      if (sq == userMove) {
        let color = board[sq] == 1 ? 'white' : 'black';
        ctx.beginPath();
        ctx.arc(col * cell+(cell/4)*2, row * cell+(cell/4)*2, cell / 5 - 2, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
}

function userInput(event) {
  let rect = canvas.getBoundingClientRect();
  let mouseX = event.clientX - rect.left;
  let mouseY = event.clientY - rect.top;
  let col = Math.floor(mouseX / cell);
  let row = Math.floor(mouseY / cell);
  let sq = (row+1) * size + (col+1);
  setStone(sq, side);
  syncBoard();
  drawBoard();
}

function idxToSgf(sq) {
  let col = (sq % 21)-1;
  let row = (Math.floor(sq / 21))-1;
  return 'abcdefghijklmnopqrs'[col] + 'abcdefghijklmnopqrs'[row];
}

function idxToGtp(sq) {
  let col = (sq % 21)-1;
  let row = (Math.floor(sq / 21))-1;
  return 'ABCDEFGHJKLMNOPQRST'[col] + (19-row);
}

function syncBoard() {
  window.gtpAPI.sendCommand('clear_board');
  for (let i = 0; i <= moveCount; i++) {
    let pos = moveHistory[i];
    if (!pos.ply) continue;
    let move = idxToGtp(pos.move);
    let side = pos.side == BLACK ? 'B': 'W';
    window.gtpAPI.sendCommand('play ' + side + ' ' + move);
  }
  window.gtpAPI.sendCommand('showboard');
  if (ponder) window.gtpAPI.sendCommand('kata-analyze 1');
}

function analyze() {
  syncBoard();
  ponder = 1;
  window.gtpAPI.sendCommand('kata-analyze 1');
}

function stop() {
  ponder = 0;
  window.gtpAPI.sendCommand('stop');
  drawBoard();
}

async function downloadSgf() {
  let content = '(;FF[4]CA[UTF-8]AP[GTP_UI]\nKM[6.5]\nPB[black]\nPW[white]\n';
  for (let pos of moveHistory) {
    if (!pos.ply) continue;
    let move = ';' + (pos.side == BLACK ? 'B': 'W') + '[' + idxToSgf(pos.move) + ']';
    content += move;
  }
  content += ')';
  console.log(content);
  const success = await window.gtpAPI.saveFile(content);
  if (success) alert('File saved');
  else alert('Failed to save file!');
}

async function uploadSgf() {
  const fileContent = await window.gtpAPI.openFile();
  if (fileContent) {
    loadSgf(fileContent);
  }
}

function loadSgfMove(move) {
  if (move.length) {
    if (move.charCodeAt(2) < 97 || move.charCodeAt(2) > 115) return -1;
    let player = move[0] == 'B' ? BLACK : WHITE;
    let col = move.charCodeAt(2)-97;
    let row = move.charCodeAt(3)-97;
    let sq = (row+1) * 21 + (col+1);
    setStone(sq, player, false);
    return row * 19 + col;
  }
}

function loadSgf(sgf) {
  for (let move of sgf.split(';')) loadSgfMove(move);
  firstMove();
}

function resizeCanvas() {
  canvas.width = window.innerHeight-90;
  canvas.height = canvas.width;
  document.getElementById('navigation').style.width = window.innerHeight-90 + 'px';
  drawBoard();
}

function initGUI() {
  let container = document.getElementById('goban');
  canvas = document.createElement('canvas');
  canvas.style = 'border: 2px solid black; margin: 4px; margin-top: 16px;';
  container.appendChild(canvas);
  canvas.addEventListener('click', userInput);
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  window.addEventListener('resize', resizeCanvas);
  document.getElementById('controls').innerHTML = `
    <div id="navigation" style="display: flex; padding-left: 5px; gap: 4px;">                               
      <button id="first" onclick="firstMove();"><<<</button id="" disabled="true">
      <button id="prevfew" onclick="prevFewMoves(10);"><<</button id="" disabled="true">
      <button onclick="prevMove();"><</button id="" disabled="true">
      <button onclick="uploadSgf();">LOAD</button id="" disabled="true">
      <button onclick="analyze();">MOVE</button id="" disabled="true">
      <button onclick="stop();">STOP</button id="" disabled="true">
      <button onclick="downloadSgf();">SAVE</button id="" disabled="true">
      <button id="next" onclick="nextMove();">></button id="" disabled="true">
      <button id="nextfew" onclick="nextFewMoves(10);">>></button id="" disabled="true">
      <button id="last" onclick="lastMove();">>>></button id="" disabled="true">
    </div>
  `;
  initGoban();
  resizeCanvas();
}
