// 全局变量
const BACKEND_URL = window.BACKEND_URL; // 确保这个变量在 HTML 中正确设置
const grid = document.getElementById('pixelGrid');
let selectedPixels = new Set();
const PRICE_PER_PIXEL = 1; // 每个像素的价格
let purchasedGroups = []; // 存储已购买的像素组
let isSelecting = false; // 是否处于选择模式
let selectionStart = null; // 选择起始像素ID
let isErasing = false; // 是否处于擦除模式

// --- 核心事件处理逻辑的抽象化 ---

// 启动选择或擦除模式的通用函数
function handleStartSelection(pixelId, isCtrlOrMetaKey) {
    if (!isPixelSelectable(pixelId)) return;

    if (selectedPixels.has(pixelId)) {
        isErasing = true;
        selectedPixels.delete(pixelId);
        document.querySelector(`[data-id="${pixelId}"]`).classList.remove('selected');
    } else {
        isErasing = false;
        isSelecting = true;
        selectionStart = pixelId;
        
        // 如果没有按 Ctrl/Cmd，清空之前选择
        if (!isCtrlOrMetaKey) {
            selectedPixels.clear();
            document.querySelectorAll('.pixel.selected').forEach(pixel => {
                pixel.classList.remove('selected');
            });
        }
        
        selectedPixels.add(pixelId);
        document.querySelector(`[data-id="${pixelId}"]`).classList.add('selected');
    }

    updateSelectionInfo();
}

// 更新选择区域的通用函数
function handleMoveSelection(currentId, isCtrlOrMetaKey) {
    if (!isPixelSelectable(currentId)) return;

    if (isErasing) {
        if (selectedPixels.has(currentId)) {
            selectedPixels.delete(currentId);
            document.querySelector(`[data-id="${currentId}"]`).classList.remove('selected');
            updateSelectionInfo();
        }
    } else if (isSelecting && selectionStart !== null) {
        const start = getPixelCoordinates(selectionStart);
        const end = getPixelCoordinates(currentId);

        const minRow = Math.min(start.row, end.row);
        const maxRow = Math.max(start.row, end.row);
        const minCol = Math.min(start.col, end.col);
        const maxCol = Math.max(start.col, end.col);

        // 如果没有按 Ctrl/Cmd，清空之前选择 (在拖动过程中也需要检查)
        if (!isCtrlOrMetaKey) {
            selectedPixels.forEach(id => {
                const pixel = document.querySelector(`[data-id="${id}"]`);
                if (pixel && id !== selectionStart) { // 不移除起始点，因为它是选择的一部分
                    pixel.classList.remove('selected');
                }
            });
            selectedPixels.clear(); // 重新开始填充
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
}

// 结束选择/擦除模式的通用函数
function endSelection() {
    isSelecting = false;
    isErasing = false;
    selectionStart = null;
}

// --- DOM 操作和辅助函数 ---

// 创建网格
function createGrid() {
    for (let i = 0; i < 100 * 140; i++) {
        const pixel = document.createElement('div');
        pixel.className = 'pixel';
        pixel.dataset.id = i;
        
        // 鼠标事件监听
        pixel.addEventListener('mousedown', handleMouseDown);
        pixel.addEventListener('mouseover', handleMouseOver);
        
        // 触摸事件监听 (touchstart 在 pixel 上，touchmove/touchend 在 grid 或 document 上)
        pixel.addEventListener('touchstart', handleTouchStart);
        
        // 点击已购买像素跳转链接
        pixel.addEventListener('click', handleClick); 
        
        grid.appendChild(pixel);
    }
    
    // 鼠标事件的全局监听
    document.addEventListener('mouseup', endSelection);
    grid.addEventListener('mouseleave', endSelection); // 鼠标滑出网格区域时结束选择
    
    // 触摸事件的全局监听 (重要，因为用户可能在滑动时手指离开 pixel)
    grid.addEventListener('touchmove', handleTouchMove);
    grid.addEventListener('touchend', endSelection); // 结束选择，无论在哪个元素上
    document.addEventListener('touchend', endSelection); // 即使滑出网格也要结束
    
    // 阻止右键菜单
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

// 检查像素是否可选（未被购买）
function isPixelSelectable(pixelId) {
    return !purchasedGroups.some(group => group.pixels.has(pixelId));
}

// --- 鼠标事件处理器 ---

function handleMouseDown(e) {
    e.preventDefault();
    if (e.button !== 0) return; // 只响应左键

    const pixelId = parseInt(e.target.dataset.id);
    handleStartSelection(pixelId, e.ctrlKey || e.metaKey);
}

function handleMouseOver(e) {
    // 只有在鼠标左键按下且处于选择/擦除模式时才处理
    if (!e.buttons || (!isSelecting && !isErasing)) return;

    const currentId = parseInt(e.target.dataset.id);
    handleMoveSelection(currentId, e.ctrlKey || e.metaKey);
}

// --- 触摸事件处理器 ---

function handleTouchStart(e) {
    e.preventDefault(); // 阻止默认的缩放/滚动
    const touch = e.touches[0]; // 获取第一个触摸点
    
    // 从触摸点坐标获取目标像素
    const targetPixel = document.elementFromPoint(touch.clientX, touch.clientY);

    if (targetPixel && targetPixel.classList.contains('pixel')) {
        const pixelId = parseInt(targetPixel.dataset.id);
        handleStartSelection(pixelId, false); // 触摸通常没有 Ctrl/Cmd 键
    }
}

function handleTouchMove(e) {
    if (!isSelecting && !isErasing) return; // 只有在选择或擦除模式下才处理
    e.preventDefault(); // 阻止默认的滚动

    const touch = e.touches[0];
    const targetPixel = document.elementFromPoint(touch.clientX, touch.clientY);

    if (targetPixel && targetPixel.classList.contains('pixel')) {
        const currentId = parseInt(targetPixel.dataset.id);
        handleMoveSelection(currentId, false); // 触摸通常没有 Ctrl/Cmd 键
    }
}

// handleClick 用于点击已购买的像素跳转，或者在非拖动模式下点击单一像素
// 注意：如果 isSelecting/isErasing 模式启动，click 事件可能会被 touchstart/mousedown 的 preventDefault 阻止
// 但如果只是单一点击未拖动，它应该能正常触发
function handleClick(e) {
    // 只有当没有进行拖动选择时，才处理单一点击跳转
    // 可以通过检查 isSelecting 或 isErasing 状态来判断
    // 简单的判断：如果 isSelecting 刚启动但没有移动，click 也会触发
    // 更严谨的方法是检查 e.detail (点击次数，但在移动端不靠谱) 或计时器
    // 对于现在，我们可以认为如果用户抬起手指时 selectionStart 仍是当前像素，则可能是点击
    // 但最简单的是，如果它已经被购买，就直接跳转
    const pixelId = parseInt(e.target.dataset.id);
    const group = purchasedGroups.find(g => g.pixels.has(pixelId));
    if (group && group.link) {
        window.open(group.link, '_blank');
    }
}

// --- UI 更新和数据相关函数 (保持不变) ---

function updateSelectionInfo() {
    const count = selectedPixels.size;
    const priceDisplay = document.getElementById('totalPrice');
    const countDisplay = document.getElementById('selectedCount');
    
    if (countDisplay) countDisplay.textContent = count;
    const newPrice = count * PRICE_PER_PIXEL;
    if (priceDisplay) {
        priceDisplay.textContent = newPrice.toLocaleString();
        priceDisplay.parentElement.classList.remove('price-change');
        void priceDisplay.parentElement.offsetWidth; // 强制重绘
        priceDisplay.parentElement.classList.add('price-change');
    }

    // 更新上传图片指导文本
    updateSelectedPixelsDisplay(); 
}

function previewImage(event) {
    const preview = document.getElementById('preview');
    const file = event.target.files[0];
    
    if (file && preview) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        reader.readAsDataURL(file);
    }
}

function validateSelection() {
    const errorMessage = document.getElementById('errorMessage');
    
    if (selectedPixels.size === 0) {
        if (errorMessage) errorMessage.textContent = '请选择要购买的像素格子';
        return false;
    }

    const pixelArray = Array.from(selectedPixels).map(id => getPixelCoordinates(parseInt(id)));
    const minRow = Math.min(...pixelArray.map(p => p.row));
    const maxRow = Math.max(...pixelArray.map(p => p.row));
    const minCol = Math.min(...pixelArray.map(p => p.col));
    const maxCol = Math.max(...pixelArray.map(p => p.col));
    
    const expectedSize = (maxRow - minRow + 1) * (maxCol - minCol + 1);
    if (selectedPixels.size !== expectedSize) {
        if (errorMessage) errorMessage.textContent = '请选择连续的像素格子';
        return false;
    }

    const imageUpload = document.getElementById('imageUpload');
    if (!imageUpload || !imageUpload.files[0]) {
        if (errorMessage) errorMessage.textContent = '请上传图片';
        return false;
    }

    const linkInput = document.getElementById('linkInput');
    if (!linkInput || !linkInput.value.trim()) {
        if (errorMessage) errorMessage.textContent = '请输入链接地址';
        return false;
    }

    if (errorMessage) errorMessage.textContent = '';
    return true;
}

function createPurchasedArea(pixels, image, link) {
    const pixelArray = Array.from(pixels).map(id => getPixelCoordinates(parseInt(id)));
    const minRow = Math.min(...pixelArray.map(p => p.row));
    const maxRow = Math.max(...pixelArray.map(p => p.row));
    const minCol = Math.min(...pixelArray.map(p => p.col));
    const maxCol = Math.max(...pixelArray.map(p => p.col));
    const PIXEL_VISUAL_UNIT = 10; 

    const overlay = document.createElement('div');
    overlay.className = 'purchased-overlay';
    overlay.style.backgroundImage = `url(${image})`;
    overlay.style.left = `${minCol * PIXEL_VISUAL_UNIT}px`;
    overlay.style.top = `${minRow * PIXEL_VISUAL_UNIT}px`;
    overlay.style.width = `${(maxCol - minCol + 1) * PIXEL_VISUAL_UNIT}px`;
    overlay.style.height = `${(maxRow - minRow + 1) * PIXEL_VISUAL_UNIT}px`;

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
        // 使用更安全的 alert 或在 UI 中显示错误
        console.error('加载购买记录失败：', err);
        const errorMessageDiv = document.getElementById('errorMessage');
        if (errorMessageDiv) {
            errorMessageDiv.textContent = '加载购买记录失败，请刷新页面。';
        } else {
            alert('加载购买记录失败：' + err.message);
        }
    });

// 初始化网格
createGrid();

function updateSelectedPixelsDisplay() {
    const count = selectedPixels.size;
    const selectedPixelCountElement = document.getElementById('selectedPixelCount');
    const currentPriceElement = document.getElementById('currentPrice');

    if (selectedPixelCountElement) selectedPixelCountElement.textContent = count;
    if (currentPriceElement) currentPriceElement.textContent = (count * PRICE_PER_PIXEL).toFixed(2);

    const guidanceTextElement = document.getElementById('imageUploadGuidance');
    if (!guidanceTextElement) return;

    if (count > 0) {
        const pixelArray = Array.from(selectedPixels).map(id => getPixelCoordinates(parseInt(id)));
        const minRow = Math.min(...pixelArray.map(p => p.row));
        const maxRow = Math.max(...pixelArray.map(p => p.row));
        const minCol = Math.min(...pixelArray.map(p => p.col));
        const maxCol = Math.max(...pixelArray.map(p => p.col));

        const areaCols = (maxCol - minCol + 1);
        const areaRows = (maxRow - minRow + 1);

        function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
        const commonDivisor = gcd(areaCols, areaRows);
        const currentRatio = `${areaCols / commonDivisor}:${areaRows / commonDivisor}`;

        guidanceTextElement.innerHTML = `
            为了在您购买的像素区域获得最佳显示效果，避免图片被裁剪或出现多余空白，我们强烈建议您上传一张**宽高比例与所选区域一致**的图片。
            <br>
            您当前选择的区域是 **${areaCols}x${areaRows} 像素格**，对应的理想图片比例是 **${currentRatio}**。
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
        const checkoutRes = await fetch(`${BACKEND_URL}/create-checkout-session/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }, // create-checkout-session 视图期望 JSON
            body: JSON.stringify({
                quantity: selectedCount,
                group_id: groupId,
            }),
        });

        const checkoutData = await checkoutRes.json();

        if (checkoutData.id) {
            // 确保 Stripe JS 库已经加载
            // 在实际项目中，Stripe 对象应该在 script 标签中预加载
            // 确保你有一个 <script src="https://js.stripe.com/v3/"></script> 在你的 HTML 中
            const stripe = Stripe("pk_live_51RRq7xD5KWKNltNDGFPjk0qKraRXEbqfEuxAatuweHawtj1eXaCZLoUaJ8YVzaQcwEtMF39GyV1jYGMgl2b9px4U00haH5kzzl"); // 请替换为您的真实 Stripe Publishable Key
            
            await new Promise(r => setTimeout(r, 100)); // 小延迟，确保Stripe加载
            stripe.redirectToCheckout({ sessionId: checkoutData.id });
        } else {
            const errorMessageElement = document.getElementById("errorMessage");
            if (errorMessageElement) {
                errorMessageElement.innerText = "Error: " + (checkoutData.error || "Unknown error during checkout session creation");
            } else {
                alert("Error: " + (checkoutData.error || "Unknown error during checkout session creation"));
            }
        }
    } catch (error) {
        console.error("Purchase process error:", error);
        const errorMessageElement = document.getElementById("errorMessage");
        if (errorMessageElement) {
            errorMessageElement.innerText = "购买失败：" + error.message;
        } else {
            alert("购买失败：" + error.message);
        }
    }
}
