// 全局变量
const grid = document.getElementById('pixelGrid');
let selectedPixels = new Set();
const PRICE_PER_PIXEL = 1;
let purchasedGroups = [];
let isSelecting = false;
let selectionStart = null;
let isErasing = false;

// 创建网格
function createGrid() {
    for (let i = 0; i < 100 * 140; i++) {
        const pixel = document.createElement('div');
        pixel.className = 'pixel';
        pixel.dataset.id = i;
        pixel.addEventListener('mousedown', handleMouseDown);
        pixel.addEventListener('mouseover', handleMouseOver);
        pixel.addEventListener('click', handleClick);
        grid.appendChild(pixel);
    }
    
    document.addEventListener('mouseup', endSelection);
    grid.addEventListener('mouseleave', endSelection);
    grid.addEventListener('contextmenu', e => e.preventDefault());
}

// 获取像素坐标
function getPixelCoordinates(pixelId) {
    return {
        row: Math.floor(pixelId / 140),
        col: pixelId % 140
    };
}

// 获取像素ID
function getPixelId(row, col) {
    return row * 140 + col;
}

// 检查像素是否可选
function isPixelSelectable(pixelId) {
    return !purchasedGroups.some(group => group.pixels.has(pixelId));
}

// 处理鼠标按下
function handleMouseDown(e) {
    e.preventDefault();
    if (e.button !== 0) return; // 只响应左键

    const pixelId = parseInt(e.target.dataset.id);
    if (!isPixelSelectable(pixelId)) return;

    if (selectedPixels.has(pixelId)) {
        isErasing = true;
        selectedPixels.delete(pixelId);
        e.target.classList.remove('selected');
    } else {
        isErasing = false;
        isSelecting = true;
        selectionStart = pixelId;
        
        // 如果没按 Ctrl / Cmd，清空之前选择
        if (!e.ctrlKey && !e.metaKey) {
            selectedPixels.clear();
            document.querySelectorAll('.pixel.selected').forEach(pixel => {
                pixel.classList.remove('selected');
            });
        }
        
        selectedPixels.add(pixelId);
        e.target.classList.add('selected');
    }

    updateSelectionInfo();
}

// 处理鼠标移动
function handleMouseOver(e) {
    const currentId = parseInt(e.target.dataset.id);
    
    // 擦除模式
    if (isErasing && e.buttons === 1) {
        if (selectedPixels.has(currentId)) {
            selectedPixels.delete(currentId);
            e.target.classList.remove('selected');
            updateSelectionInfo();
        }
        return;
    }

    // 非选择模式 或 无按键 不处理
    if (!isSelecting || !selectionStart || !e.buttons) return;
    if (!isPixelSelectable(currentId)) return;

    // 计算选择区域
    updateSelectionArea(selectionStart, currentId, e);
}

// 更新选择区域，传入事件对象，方便检测 Ctrl/Cmd 状态
function updateSelectionArea(startId, endId, event) {
    const start = getPixelCoordinates(startId);
    const end = getPixelCoordinates(endId);

    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    // 如果没按 Ctrl / Cmd，清空之前选择
    if (!(event?.ctrlKey || event?.metaKey)) {
        selectedPixels.forEach(id => {
            const pixel = document.querySelector(`[data-id="${id}"]`);
            if (pixel) pixel.classList.remove('selected');
        });
        selectedPixels.clear();
    }

    // 添加新选择
    for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
            const id = getPixelId(row, col);
            if (isPixelSelectable(id)) {
                selectedPixels.add(id);
                const pixel = document.querySelector(`[data-id="${id}"]`);
                if (pixel) pixel.classList.add('selected');
            }
        }
    }

    updateSelectionInfo();
}

// 结束选择
function endSelection() {
    isSelecting = false;
    isErasing = false;
    selectionStart = null;
}

// 点击已购买像素跳转链接
function handleClick(e) {
    const pixelId = parseInt(e.target.dataset.id);
    const group = purchasedGroups.find(g => g.pixels.has(pixelId));
    if (group && group.link) {
        window.open(group.link, '_blank');
    }
}

// 更新选择信息显示
function updateSelectionInfo() {
    const count = selectedPixels.size;
    const priceDisplay = document.getElementById('totalPrice');
    const countDisplay = document.getElementById('selectedCount');
    
    countDisplay.textContent = count;
    const newPrice = count * PRICE_PER_PIXEL;
    priceDisplay.textContent = newPrice.toLocaleString();
    
    // 触发价格变化动画
    priceDisplay.parentElement.classList.remove('price-change');
    void priceDisplay.parentElement.offsetWidth; // 强制重绘
    priceDisplay.parentElement.classList.add('price-change');
}

// 预览图片
function previewImage(event) {
    const preview = document.getElementById('preview');
    const file = event.target.files[0];
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        reader.readAsDataURL(file);
    }
}

// 验证用户选择的像素和输入信息
function validateSelection() {
    const errorMessage = document.getElementById('errorMessage');
    
    if (selectedPixels.size === 0) {
        errorMessage.textContent = '请选择要购买的像素格子';
        return false;
    }

    const pixelArray = Array.from(selectedPixels).map(id => getPixelCoordinates(parseInt(id)));
    const minRow = Math.min(...pixelArray.map(p => p.row));
    const maxRow = Math.max(...pixelArray.map(p => p.row));
    const minCol = Math.min(...pixelArray.map(p => p.col));
    const maxCol = Math.max(...pixelArray.map(p => p.col));
    

    const expectedSize = (maxRow - minRow + 1) * (maxCol - minCol + 1);
    if (selectedPixels.size !== expectedSize) {
        errorMessage.textContent = '请选择连续的像素格子';
        return false;
    }

    const imageUpload = document.getElementById('imageUpload');
    if (!imageUpload.files[0]) {
        errorMessage.textContent = '请上传图片';
        return false;
    }

    const linkInput = document.getElementById('linkInput');
    if (!linkInput.value.trim()) {
        errorMessage.textContent = '请输入链接地址';
        return false;
    }

    errorMessage.textContent = '';
    return true;
}

// 创建覆盖层显示已购买区域
function createPurchasedArea(pixels, image, link) {
    const pixelArray = Array.from(pixels).map(id => getPixelCoordinates(parseInt(id)));
    const minRow = Math.min(...pixelArray.map(p => p.row));
    const maxRow = Math.max(...pixelArray.map(p => p.row));
    const minCol = Math.min(...pixelArray.map(p => p.col));
    const maxCol = Math.max(...pixelArray.map(p => p.col));
    const PIXEL_VISUAL_UNIT = 10; // 10px content + 1px gap

    const overlay = document.createElement('div');
    overlay.className = 'purchased-overlay';
    overlay.style.backgroundImage = `url(${image})`;
    overlay.style.left = `${minCol * (PIXEL_VISUAL_UNIT)}px`;
    overlay.style.top = `${minRow * (PIXEL_VISUAL_UNIT)}px`;
    overlay.style.width = `${(maxCol - minCol + 1) * PIXEL_VISUAL_UNIT }px`; // Subtract 1px from total width
    overlay.style.height = `${(maxRow - minRow + 1) * PIXEL_VISUAL_UNIT}px`; // Subtract 1px from total height

    if (link) {
        overlay.style.cursor = 'pointer';
        overlay.addEventListener('click', () => window.open(link, '_blank'));
    }

    return overlay;
}

// 加载已购买区域数据
fetch('http://127.0.0.1:8000/purchased-list/')
    .then(async res => {
        if (!res.ok) throw new Error('无法获取已购买数据');

        const contentType = res.headers.get('Content-Type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await res.text();
            throw new Error('服务器未返回 JSON：' + text);
        }

        return res.json();
    })
    .then(data => {
        data.forEach(group => {
            const pixelSet = new Set(group.pixels);
            purchasedGroups.push({
                pixels: pixelSet,
                image: group.image,
                link: group.link
            });

            const overlay = createPurchasedArea(pixelSet, group.image, group.link);
            grid.appendChild(overlay);

            pixelSet.forEach(id => {
                const pixel = document.querySelector(`[data-id="${id}"]`);
                if (pixel) pixel.classList.add('purchased');
            });
        });
    })
    .catch(err => {
        alert('加载购买记录失败：' + err.message);
    });

// 购买功能
function purchase() {
    if (!validateSelection()) return;

    const imageFile = document.getElementById('imageUpload').files[0];
    const link = document.getElementById('linkInput').value.trim();
    const title = document.getElementById('titleInput').value.trim();  // 新增

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('link', link);
    formData.append('pixels', JSON.stringify(Array.from(selectedPixels)));
    formData.append('title', title);   // 新增传title字段

    fetch('http://127.0.0.1:8000/save-purchase/', {
        method: 'POST',
        body: formData
    })
    .then(async res => {
        if (!res.ok) {
            const text = await res.text();
            throw new Error('服务器返回错误：' + text);
        }

        const contentType = res.headers.get('Content-Type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await res.text();
            throw new Error('响应不是 JSON：' + text);
        }

        return res.json();
    })
    .then(data => {
        alert(data.message || '购买成功！');

        // 新增购买区域覆盖层
        const newPixels = new Set(selectedPixels);
        purchasedGroups.push({
            pixels: newPixels,
            image: data.image_url, // 后端返回的图片 URL
            link: link
        });

        const overlay = createPurchasedArea(newPixels, data.image_url, link);
        grid.appendChild(overlay);

        // 标记像素为已购买状态
        newPixels.forEach(id => {
            const pixel = document.querySelector(`[data-id="${id}"]`);
            if (pixel) {
                pixel.classList.remove('selected');
                pixel.classList.add('purchased');
            }
        });

        selectedPixels.clear();
        updateSelectionInfo();

        // 清理表单
        document.getElementById('imageUpload').value = '';
        document.getElementById('linkInput').value = '';
        document.getElementById('preview').style.display = 'none';
        document.getElementById('titleInput').value = '';
    })
    .catch(err => {
        alert('购买失败：' + err.message);
    });
}

// 初始化网格
createGrid();

// 这个函数应该在你选择像素后被调用，例如在 addPixelToSelection 或 removePixelFromSelection 中
function updateSelectedPixelsDisplay() {
    const count = selectedPixels.size;
    document.getElementById('selectedPixelCount').textContent = count;
    document.getElementById('currentPrice').textContent = (count * pricePerPixel).toFixed(2);

    const guidanceTextElement = document.getElementById('imageUploadGuidance');
    if (!guidanceTextElement) return; // 确保元素存在

    if (count > 0) {
        const pixelArray = Array.from(selectedPixels).map(id => getPixelCoordinates(parseInt(id)));
        const minRow = Math.min(...pixelArray.map(p => p.row));
        const maxRow = Math.max(...pixelArray.map(p => p.row));
        const minCol = Math.min(...pixelArray.map(p => p.col));
        const maxCol = Math.max(...pixelArray.map(p => p.col));

        const areaCols = (maxCol - minCol + 1);
        const areaRows = (maxRow - minRow + 1);

        // 计算简化比例 (可选，但更友好)
        function getSimplifiedRatio(width, height) {
            function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
            const commonDivisor = gcd(width, height);
            return `<span class="math-inline">\{width / commonDivisor\}\:</span>{height / commonDivisor}`;
        }

        const currentRatio = getSimplifiedRatio(areaCols, areaRows);

        guidanceTextElement.innerHTML = `
            为了在您购买的像素区域获得最佳显示效果，避免图片被裁剪或出现多余空白，我们强烈建议您上传一张**宽高比例与所选区域一致**的图片。
            <br>
            您当前选择的区域是 **<span class="math-inline">\{areaCols\}x</span>{areaRows} 像素格**，对应的理想图片比例是 **${currentRatio}**。
            <br>
            **小提示：** 如果图片比例不匹配，系统会尽可能地完整显示您的图片，但可能会在图片周围留白。
        `;
    } else {
        guidanceTextElement.innerHTML = `
            为了在您购买的像素区域获得最佳显示效果，请选择像素后查看建议的图片比例。
        `;
    }
}

// 确保在每次像素选择变化时调用此函数
// 例如，在 addPixelToSelection 和 removePixelFromSelection 的末尾调用 updateSelectedPixelsDisplay();