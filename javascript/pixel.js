// 全局变量
const BACKEND_URL = window.BACKEND_URL;
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
        pixel.addEventListener('touchstart', handleTouchStart);
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
fetch(`${BACKEND_URL}/purchased-list/`)
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

// 这是你前端最终应该使用的 purchase 函数
async function purchase() {
    // 1. 调用 validateSelection 确保前端输入有效 (确保 validateSelection 检查所有必要字段)
    if (!validateSelection()) {
        console.log("前端验证失败，阻止提交。"); 
        return;
    }

    const imageFile = document.getElementById('imageUpload').files[0];
    const link = document.getElementById('linkInput').value.trim();
    const title = document.getElementById('titleInput').value.trim();
    const pixelIdsArray = Array.from(selectedPixels); // 获取选择的像素ID数组
    const selectedCount = selectedPixels.size; // 确保 selectedPixels 在此作用域内是可访问的 Set 对象

    // 如果需要，可以在这里添加前端调试日志，确认这些值在 FormData 构造前是否正确
    // console.log("Debug Info (Frontend before FormData):");
    // console.log("Image File:", imageFile);
    // console.log("Link:", link);
    // console.log("Title:", title);
    // console.log("Selected Pixels Array:", pixelIdsArray);

    // 使用 FormData 来构建请求体，以匹配后端期望的 multipart/form-data
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('link', link);
    formData.append('pixels', JSON.stringify(pixelIdsArray)); // 确保是 JSON 字符串
    formData.append('title', title);

    try {
        // 1. 调用 save-purchase 接口
        const saveRes = await fetch(`${BACKEND_URL}/save-purchase/`, {
            method: "POST",
            // *** 关键修改：移除 headers 中的 Content-Type，让浏览器自动设置 multipart/form-data ***
            body: formData, // *** 关键修改：使用 FormData 作为请求体 ***
        });

        if (!saveRes.ok) {
            // 获取并打印后端返回的具体错误信息，这将帮助你更好地调试
            const errorText = await saveRes.text();
            console.error("Error from save-purchase (Response Text):", errorText); // 打印到控制台
            throw new Error(`保存失败: ${saveRes.status} - ${errorText}`);
        }

        const saveData = await saveRes.json();
        // 确保后端 save_purchase 视图返回了 group_id
        const groupId = saveData.group_id; 

        // 2. 创建结账会话，这里仍然是 JSON 请求
        const checkoutRes = await fetch(`${BACKEND_URL}create-checkout-session/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }, // create-checkout-session 视图期望 JSON
            body: JSON.stringify({
                quantity: selectedCount,
                group_id: groupId,
            }),
        });

        const checkoutData = await checkoutRes.json();

        if (checkoutData.id) {
            const stripe = Stripe("pk_live_51RRq7xD5KWKNltNDGFPjk0qKraRXEbqfEuxAatuweHawtj1eXaCZLoUaJ8YVzaQcwEtMF39GyV1jYGMgl2b9px4U00haH5kzzl");
            // 确保 Stripe JS 库已经加载
            // 在实际项目中，Stripe 对象应该在 script 标签中预加载
            // 确保你有一个 <script src="https://js.stripe.com/v3/"></script> 在你的 HTML 中
            
            await new Promise(r => setTimeout(r, 100)); // 小延迟，确保Stripe加载
            stripe.redirectToCheckout({ sessionId: checkoutData.id });
        } else {
            document.getElementById("errorMessage").innerText = "Error: " + (checkoutData.error || "Unknown error during checkout session creation");
        }
    } catch (error) {
        console.error("Purchase process error:", error);
        document.getElementById("errorMessage").innerText = "购买失败：" + error.message;
    }
}


function handleTouchStart(e) {
    e.preventDefault();
    // 让 touch 行为和鼠标点击一样
    handleMouseDown({
        target: e.target,
        button: 0, // 模拟左键
        preventDefault: () => {},
        ctrlKey: false,
        metaKey: false
    });
}