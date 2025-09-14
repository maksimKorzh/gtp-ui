var canvas, ctx, cell;
var gameOver = 1;

const bgImage = new Image();
const blackStoneImage = new Image();
const whiteStoneImage = new Image();
const moveSound = new Audio('./assets/112-2052.wav');
bgImage.src = './assets/board_fox.png';
blackStoneImage.src = './assets/stone_b_fox.png';
whiteStoneImage.src = './assets/stone_w_fox.png';

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
  drawBoard();
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

function downloadSgf() {
}

function resizeCanvas() {
  canvas.width = window.innerHeight-90;
  canvas.height = canvas.width;
  document.getElementById('navigation').style.width = window.innerHeight-90 + 'px';
  drawBoard();
}

function handleSave() {
  if (gameOver) downloadSgf();
  else {
    editMode = 0;
    handlePass();
    downloadSgf();
  }
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
      <button id="prevfew" onclick="prevFewMoves();"><<</button id="" disabled="true">
      <button onclick="prevMove();">UNDO</button id="" disabled="true">
      <button onclick="uploadSgf();">LOAD</button id="" disabled="true">
      <button onclick="analyze();">MOVE</button id="" disabled="true">
      <button onclick="newGame();">DROP</button id="" disabled="true">
      <button onclick="download();">SAVE</button id="" disabled="true">
      <button id="next" onclick="nextMove();">NEXT</button id="" disabled="true">
      <button id="nextfew" onclick="nextFewMoves();">>></button id="" disabled="true">
      <button id="last" onclick="lastMove();">>>></button id="" disabled="true">
    </div>
  `;
  initGoban();
  resizeCanvas();
}
