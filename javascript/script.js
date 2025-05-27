
const BACKEND_URL = window.BACKEND_URL;
const gridContainer = document.getElementById('gridContainer');
const rows = 100;
const cols = 140;
const totalCells = rows * cols;

// 创建格子
for (let i = 0; i < totalCells; i++) {
  const gridItem = document.createElement('div');
  gridItem.classList.add('grid-item');
  gridItem.dataset.id = i;
  gridContainer.appendChild(gridItem);
}

// 像素坐标
function getPixelCoordinates(pixelId) {
  return {
    row: Math.floor(pixelId / cols),
    col: pixelId % cols
  };
}

// 加载数据
fetch(`${BACKEND_URL}/purchased-list/`)
  .then(res => res.json())
  .then(data => {
    data.forEach(group => {
      const pixelIds = group.pixels.map(p => parseInt(p));
      const imgUrl = group.image;
      const link = group.link;
      const title = group.title || '';  // 获取title

      const coords = pixelIds.map(id => {
        return {
          row: Math.floor(id / cols),
          col: id % cols
        };
      });

      const minRow = Math.min(...coords.map(c => c.row));
      const maxRow = Math.max(...coords.map(c => c.row));
      const minCol = Math.min(...coords.map(c => c.col));
      const maxCol = Math.max(...coords.map(c => c.col));

      const widthInPixels = maxCol - minCol + 1;
      const heightInPixels = maxRow - minRow + 1;

      // 创建覆盖图片元素
      const imgOverlay = document.createElement('div');
      imgOverlay.style.position = 'absolute';
      imgOverlay.style.top = (minRow * 10) + 'px';  // 10是格子尺寸
      imgOverlay.style.left = (minCol * 10) + 'px';
      imgOverlay.style.width = (widthInPixels * 10) + 'px';
      imgOverlay.style.height = (heightInPixels * 10) + 'px';
      imgOverlay.style.backgroundImage = `url(${imgUrl})`;
      imgOverlay.style.backgroundSize = 'cover';
      imgOverlay.style.backgroundRepeat = 'no-repeat';
      imgOverlay.style.backgroundPosition = 'center';

      imgOverlay.title = title;  // 悬停显示title

      // 创建文字标题层
      if (title) {
        imgOverlay.title = title;  // 悬停显示title
      }

      if (link) {
        imgOverlay.style.cursor = 'pointer';
        imgOverlay.addEventListener('click', () => window.open(link, '_blank'));
      }

      gridContainer.appendChild(imgOverlay);
    });
  })
  .catch(err => {
    alert('加载失败: ' + err.message);
  });
