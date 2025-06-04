// 全局变量
const BACKEND_URL = window.BACKEND_URL; // 确保这个变量在 HTML 中正确设置
const grid = document.getElementById('pixelGrid');
let selectedPixels = new Set();
const PRICE_PER_PIXEL = 1; // 每个像素的价格
let purchasedGroups = []; // 存储已购买的像素组
let isSelecting = false; // 是否处于选择模式
let selectionStart = null; // 选择起始像素ID
let isErasing = false; // 是否处于擦除模式

// --- 新增防连点相关的全局变量和元素引用 ---
const purchaseButton = document.querySelector('.buy-btn'); // 获取购买按钮
const errorMessageElement = document.getElementById('errorMessage'); // 获取显示错误信息的元素
let isProcessingPurchase = false; // 标记是否正在处理购买流程，防止重复点击

// --- 核心事件处理逻辑的抽象化 ---

// 启动选择或擦除模式的通用函数
function handleStartSelection(pixelId, isCtrlOrMetaKey) {
    if (!isPixelSelectable(pixelId)) return; // 如果像素不可选（已被购买），则直接返回

    if (selectedPixels.has(pixelId)) {
        isErasing = true; // 如果点击的是已选中的像素，进入擦除模式
        selectedPixels.delete(pixelId);
        document.querySelector(`[data-id="${pixelId}"]`).classList.remove('selected');
    } else {
        isErasing = false; // 进入选择模式
        isSelecting = true;
        selectionStart = pixelId; // 记录选择的起始像素ID

        // 如果没有按 Ctrl/Cmd 键，清空之前的所有选择
        if (!isCtrlOrMetaKey) {
            selectedPixels.clear();
            document.querySelectorAll('.pixel.selected').forEach(pixel => {
                pixel.classList.remove('selected');
            });
        }

        selectedPixels.add(pixelId); // 将当前点击的像素添加到选中集合
        document.querySelector(`[data-id="${pixelId}"]`).classList.add('selected'); // 添加选中样式
    }

    updateSelectionInfo(); // 更新选择信息（如数量、价格）
}

// 更新选择区域的通用函数 (鼠标/触摸移动时触发)
function handleMoveSelection(currentId, isCtrlOrMetaKey) {
    if (!isPixelSelectable(currentId)) return; // 如果当前像素不可选，则返回

    if (isErasing) { // 如果处于擦除模式
        if (selectedPixels.has(currentId)) {
            selectedPixels.delete(currentId); // 从选中集合中移除像素
            document.querySelector(`[data-id="${currentId}"]`).classList.remove('selected'); // 移除选中样式
            updateSelectionInfo(); // 更新选择信息
        }
    } else if (isSelecting && selectionStart !== null) { // 如果处于选择模式且有起始像素
        const start = getPixelCoordinates(selectionStart); // 获取起始像素的坐标
        const end = getPixelCoordinates(currentId); // 获取当前像素的坐标

        // 计算选择区域的最小/最大行和列
        const minRow = Math.min(start.row, end.row);
        const maxRow = Math.max(start.row, end.row);
        const minCol = Math.min(start.col, end.col);
        const maxCol = Math.max(start.col, end.col);

        // 如果没有按 Ctrl/Cmd 键，清空之前选择 (在拖动过程中也需要检查，以实现矩形选择)
        if (!isCtrlOrMetaKey) {
            selectedPixels.forEach(id => {
                const pixel = document.querySelector(`[data-id="${id}"]`);
                if (pixel && id !== selectionStart) { // 不移除起始点，因为它始终是选择的一部分
                    pixel.classList.remove('selected');
                }
            });
            selectedPixels.clear(); // 清空所有选中的像素，重新填充
        }

        // 遍历并添加新选择区域内的所有像素
        for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
                const id = getPixelId(row, col); // 根据行列获取像素ID
                if (isPixelSelectable(id)) { // 如果像素可选
                    selectedPixels.add(id); // 添加到选中集合
                    const pixel = document.querySelector(`[data-id="${id}"]`);
                    if (pixel) pixel.classList.add('selected'); // 添加选中样式
                }
            }
        }
        updateSelectionInfo(); // 更新选择信息
    }
}

// 结束选择/擦除模式的通用函数 (鼠标抬起或离开网格时触发)
function endSelection() {
    isSelecting = false; // 退出选择模式
    isErasing = false; // 退出擦除模式
    selectionStart = null; // 清除起始像素ID
}

// --- DOM 操作和辅助函数 ---

// 创建网格
function createGrid() {
    for (let i = 0; i < 100 * 140; i++) { // 创建 100 行 x 140 列的像素
        const pixel = document.createElement('div');
        pixel.className = 'pixel'; // 添加基础 CSS 类
        pixel.dataset.id = i; // 设置数据属性，存储像素ID

        // 鼠标事件监听器
        pixel.addEventListener('mousedown', handleMouseDown); // 鼠标按下
        pixel.addEventListener('mouseover', handleMouseOver); // 鼠标悬停（用于拖动选择）

        // 触摸事件监听器 (touchstart 在像素上，touchmove/touchend 在网格或文档上)
        pixel.addEventListener('touchstart', handleTouchStart); // 触摸开始

        // 点击已购买像素跳转链接
        pixel.addEventListener('click', handleClick); // 点击已购买像素

        grid.appendChild(pixel); // 将像素添加到网格容器
    }

    // 鼠标事件的全局监听器
    document.addEventListener('mouseup', endSelection); // 鼠标在文档任意位置抬起时结束选择
    grid.addEventListener('mouseleave', endSelection); // 鼠标滑出网格区域时结束选择

    // 触摸事件的全局监听器 (重要，因为用户可能在滑动时手指离开像素)
    grid.addEventListener('touchmove', handleTouchMove); // 触摸移动
    grid.addEventListener('touchend', endSelection); // 触摸结束，无论在哪个元素上
    document.addEventListener('touchend', endSelection); // 即使滑出网格也要结束

    // 阻止右键菜单 (防止在网格上右键出现菜单影响用户体验)
    grid.addEventListener('contextmenu', e => e.preventDefault());
}

// 获取像素的行和列坐标
function getPixelCoordinates(pixelId) {
    return {
        row: Math.floor(pixelId / 140), // 行号
        col: pixelId % 140 // 列号
    };
}

// 根据行和列获取像素ID
function getPixelId(row, col) {
    return row * 140 + col;
}

// 检查像素是否可选（即未被任何已购买的组占据）
function isPixelSelectable(pixelId) {
    return !purchasedGroups.some(group => group.pixels.has(pixelId));
}

// --- 鼠标事件处理器 ---

function handleMouseDown(e) {
    e.preventDefault(); // 阻止默认的拖动行为或文本选择
    if (e.button !== 0) return; // 只响应鼠标左键点击

    const pixelId = parseInt(e.target.dataset.id); // 获取点击像素的ID
    handleStartSelection(pixelId, e.ctrlKey || e.metaKey); // 调用通用选择启动函数
}

function handleMouseOver(e) {
    // 只有在鼠标左键按下且处于选择/擦除模式时才处理（e.buttons 表示当前按下的鼠标按钮，1表示左键）
    if (!e.buttons || (!isSelecting && !isErasing)) return;

    const currentId = parseInt(e.target.dataset.id); // 获取当前鼠标悬停的像素ID
    handleMoveSelection(currentId, e.ctrlKey || e.metaKey); // 调用通用选择移动函数
}

// --- 触摸事件处理器 ---

function handleTouchStart(e) {
    e.preventDefault(); // 阻止默认的缩放/滚动行为
    const touch = e.touches[0]; // 获取第一个触摸点

    // 从触摸点坐标获取目标像素元素
    const targetPixel = document.elementFromPoint(touch.clientX, touch.clientY);

    if (targetPixel && targetPixel.classList.contains('pixel')) {
        const pixelId = parseInt(targetPixel.dataset.id); // 获取触摸像素的ID
        handleStartSelection(pixelId, false); // 触摸通常没有 Ctrl/Cmd 键，所以传入 false
    }
}

function handleTouchMove(e) {
    if (!isSelecting && !isErasing) return; // 只有在选择或擦除模式下才处理
    e.preventDefault(); // 阻止默认的滚动

    const touch = e.touches[0];
    const targetPixel = document.elementFromPoint(touch.clientX, touch.clientY); // 获取触摸点下的元素

    if (targetPixel && targetPixel.classList.contains('pixel')) {
        const currentId = parseInt(targetPixel.dataset.id); // 获取当前触摸到的像素ID
        handleMoveSelection(currentId, false); // 触摸通常没有 Ctrl/Cmd 键
    }
}

// handleClick 用于点击已购买的像素跳转，或者在非拖动模式下点击单一像素
// 注意：如果 isSelecting/isErasing 模式启动，click 事件可能会被 touchstart/mousedown 的 preventDefault 阻止
// 但如果只是单一点击未拖动，它应该能正常触发
function handleClick(e) {
    // 简单的判断：如果像素已经被购买，就直接跳转
    const pixelId = parseInt(e.target.dataset.id);
    const group = purchasedGroups.find(g => g.pixels.has(pixelId)); // 查找该像素所属的已购买组
    if (group && group.link) { // 如果找到组并且有链接
        window.open(group.link, '_blank'); // 在新标签页打开链接
    }
}

// --- UI 更新和数据相关函数 ---

// 更新选择信息（数量和总价）
function updateSelectionInfo() {
    const count = selectedPixels.size; // 获取当前选中的像素数量
    const priceDisplay = document.getElementById('totalPrice'); // 总价显示元素
    const countDisplay = document.getElementById('selectedCount'); // 数量显示元素

    if (countDisplay) countDisplay.textContent = count; // 更新数量
    const newPrice = count * PRICE_PER_PIXEL; // 计算新总价
    if (priceDisplay) {
        priceDisplay.textContent = newPrice.toLocaleString(); // 更新总价，并格式化数字
        // 动画效果，移除并重新添加 class 强制重绘
        priceDisplay.parentElement.classList.remove('price-change');
        void priceDisplay.parentElement.offsetWidth; // 强制浏览器重绘以触发动画
        priceDisplay.parentElement.classList.add('price-change');
    }

    updateSelectedPixelsDisplay(); // 更新上传图片指导文本
}

// 预览上传的图片
function previewImage(event) {
    const preview = document.getElementById('preview'); // 图片预览元素
    const file = event.target.files[0]; // 获取选择的文件

    if (file && preview) {
        const reader = new FileReader(); // 创建 FileReader 对象
        reader.onload = function(e) {
            preview.src = e.target.result; // 设置图片预览的 src
            preview.style.display = 'block'; // 显示预览图片
        }
        reader.readAsDataURL(file); // 读取文件为 Data URL
    }
}

// 验证用户选择和输入
function validateSelection() {
    // errorMessageElement 已经由全局变量获取

    if (selectedPixels.size === 0) {
        if (errorMessageElement) errorMessageElement.textContent = 'Please select at least one pixel grid.'; // 请选择至少一个像素格子。
        return false;
    }

    // 获取选中像素的坐标并计算其边界
    const pixelArray = Array.from(selectedPixels).map(id => getPixelCoordinates(parseInt(id)));
    const minRow = Math.min(...pixelArray.map(p => p.row));
    const maxRow = Math.max(...pixelArray.map(p => p.row));
    const minCol = Math.min(...pixelArray.map(p => p.col));
    const maxCol = Math.max(...pixelArray.map(p => p.col));

    // 检查选择的像素是否形成连续的矩形区域
    const expectedSize = (maxRow - minRow + 1) * (maxCol - minCol + 1);
    if (selectedPixels.size !== expectedSize) {
        if (errorMessageElement) errorMessageElement.textContent = 'Please select continuous pixel grids.'; // 请选择连续的像素格子。
        return false;
    }

    const imageUpload = document.getElementById('imageUpload');
    if (!imageUpload || !imageUpload.files[0]) {
        if (errorMessageElement) errorMessageElement.textContent = 'Please upload an image.'; // 请上传图片。
        return false;
    }

    const linkInput = document.getElementById('linkInput');
    if (!linkInput || !linkInput.value.trim()) {
        if (errorMessageElement) errorMessageElement.textContent = 'Please enter a link URL.'; // 请输入链接地址。
        return false;
    }

    if (errorMessageElement) errorMessageElement.textContent = ''; // 清空错误信息
    return true;
}

// 创建已购买区域的覆盖层
function createPurchasedArea(pixels, image, link) {
    // 获取已购买像素的坐标，并计算其外框尺寸
    const pixelArray = Array.from(pixels).map(id => getPixelCoordinates(parseInt(id)));
    const minRow = Math.min(...pixelArray.map(p => p.row));
    const maxRow = Math.max(...pixelArray.map(p => p.row));
    const minCol = Math.min(...pixelArray.map(p => p.col));
    const maxCol = Math.max(...pixelArray.map(p => p.col));
    const PIXEL_VISUAL_UNIT = 10; // 每个像素在视觉上的单位大小（例如：10px）

    const overlay = document.createElement('div');
    overlay.className = 'purchased-overlay'; // 添加 CSS 类
    overlay.style.backgroundImage = `url(${image})`; // 设置背景图片
    overlay.style.left = `${minCol * PIXEL_VISUAL_UNIT}px`; // 设置左边距
    overlay.style.top = `${minRow * PIXEL_VISUAL_UNIT}px`; // 设置上边距
    overlay.style.width = `${(maxCol - minCol + 1) * PIXEL_VISUAL_UNIT}px`; // 设置宽度
    overlay.style.height = `${(maxRow - minRow + 1) * PIXEL_VISUAL_UNIT}px`; // 设置高度

    if (link) { // 如果有链接，则设置鼠标样式为手型并添加点击事件
        overlay.style.cursor = 'pointer';
        overlay.addEventListener('click', () => window.open(link, '_blank')); // 点击打开链接
    }

    return overlay;
}

// 加载已购买区域数据 (从后端获取)
fetch(`${BACKEND_URL}/purchased-list/`)
    .then(async res => {
        if (!res.ok) throw new Error('Failed to fetch purchased data.'); // 无法获取已购买数据。

        const contentType = res.headers.get('Content-Type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await res.text();
            throw new Error('Server did not return JSON: ' + text); // 服务器未返回 JSON。
        }

        return res.json();
    })
    .then(data => {
        data.forEach(group => {
            const pixelSet = new Set(group.pixels); // 将像素ID列表转换为 Set 便于查找
            purchasedGroups.push({ // 存储已购买的组信息
                pixels: pixelSet,
                image: group.image,
                link: group.link
            });

            const overlay = createPurchasedArea(pixelSet, group.image, group.link); // 创建覆盖层
            grid.appendChild(overlay); // 将覆盖层添加到网格

            pixelSet.forEach(id => {
                const pixel = document.querySelector(`[data-id="${id}"]`);
                if (pixel) pixel.classList.add('purchased'); // 给已购买的像素添加 CSS 类
            });
        });
    })
    .catch(err => {
        // 使用更安全的错误提示方式
        console.error('Failed to load purchase records:', err); // 加载购买记录失败。
        if (errorMessageElement) {
            errorMessageElement.textContent = 'Failed to load purchase records, please refresh the page.'; // 加载购买记录失败，请刷新页面。
        } else {
            alert('Failed to load purchase records: ' + err.message); // 弹出错误提示
        }
    });

// 初始化网格 (页面加载时创建像素网格)
createGrid();

// 更新选择像素的显示信息和图片上传指南
function updateSelectedPixelsDisplay() {
    const count = selectedPixels.size; // 选中的像素数量
    const selectedPixelCountElement = document.getElementById('selectedCount'); // 选中的像素数量显示元素
    const currentPriceElement = document.getElementById('totalPrice'); // 总价显示元素

    if (selectedPixelCountElement) selectedPixelCountElement.textContent = count;
    if (currentPriceElement) currentPriceElement.textContent = (count * PRICE_PER_PIXEL).toFixed(2);

    const guidanceTextElement = document.querySelector('.guidance-text_pixel small.guidance-text'); // 指南文本元素

    if (guidanceTextElement) { // 检查元素是否存在
        if (count > 0) { // 如果有像素被选中
            const pixelArray = Array.from(selectedPixels).map(id => getPixelCoordinates(parseInt(id)));
            const minRow = Math.min(...pixelArray.map(p => p.row));
            const maxRow = Math.max(...pixelArray.map(p => p.row));
            const minCol = Math.min(...pixelArray.map(p => p.col));
            const maxCol = Math.max(...pixelArray.map(p => p.col));

            const areaCols = (maxCol - minCol + 1); // 选中区域的列数
            const areaRows = (maxRow - minRow + 1); // 选中区域的行数

            function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); } // 求最大公约数
            const commonDivisor = gcd(areaCols, areaRows);
            const currentRatio = `${areaCols / commonDivisor}:${areaRows / commonDivisor}`; // 计算宽高比

            guidanceTextElement.innerHTML = `
                <ul>
                    <li>To achieve the best display effect in your purchased pixel area, and to avoid cropping or unwanted blank space, we strongly recommend uploading an image with the **same aspect ratio as the selected area**.</li>
                    <br>
                    <li>You selected an area of **${areaCols} × ${areaRows} pixels**. Since each pixel is **10px × 10px**, the image should be **${areaCols * 10}px × ${areaRows * 10}px** in size (aspect ratio **${currentRatio}**).</li>
                    <br>
                    <li>**Tip:** If the image ratio does not match, the system will try to display your image as fully as possible but may leave blank space around it. You can also use ChatGPT or any tools to resize your image.</li>
                </ul>
            `;
        } else {
            // 如果没有像素被选中，显示原始的通用指南文本
            guidanceTextElement.innerHTML = `
                <ul>
                    <li>To achieve the best display effect in your purchased pixel area, and to avoid cropping or unwanted blank space, we strongly recommend uploading an image with the **same aspect ratio as the selected area**.</li>
                    <br>
                    <li>You selected an area of **2 × 3 pixels**. Since each pixel is **10px × 10px**, the image should be **20px × 30px** in size (aspect ratio **2:3**).</li>
                    <br>
                    <li>**Tip:** If the image ratio does not match, the system will try to display your image as fully as possible but may leave blank space around it. You can also use the ChatGPT or any tools to resize your image.</li>
                </ul>
            `;
        }
    }
}


// --- 这是你前端最终应该使用的 purchase 函数，已集成防连点逻辑 ---
async function purchase() {
    // 1. 防连点检查
    if (isProcessingPurchase) {
        console.log("Purchase is already in progress. Please do not click repeatedly."); // 购买正在进行中。请勿重复点击。
        return; // 如果正在处理中，则直接返回，阻止重复提交
    }

    // 设置处理标志，禁用按钮，并更新按钮文本
    isProcessingPurchase = true;
    purchaseButton.disabled = true; // 禁用按钮
    purchaseButton.textContent = 'Processing... Please wait'; // 更改按钮文本为“处理中...请稍候”

    // 清除任何之前的错误信息
    errorMessageElement.textContent = '';
    // errorMessageElement.style.display = 'none';

    // 2. 调用 validateSelection 确保前端输入有效
    if (!validateSelection()) {
        console.log("Frontend validation failed, submission blocked."); // 前端验证失败，阻止提交。
        resetPurchaseButton(); // 验证失败时重置按钮状态
        return;
    }

    const imageFile = document.getElementById('imageUpload').files[0];
    const link = document.getElementById('linkInput').value.trim();
    const title = document.getElementById('titleInput').value.trim();
    const pixelIdsArray = Array.from(selectedPixels); // 获取选择的像素ID数组
    const selectedCount = selectedPixels.size; // 获取选中的像素数量

    // 使用 FormData 来构建请求体，以匹配后端期望的 multipart/form-data
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('link', link);
    formData.append('pixels', JSON.stringify(pixelIdsArray)); // 将像素ID数组转换为 JSON 字符串
    formData.append('title', title);

    try {
        // 1. 调用 save-purchase 接口 (预先保存购买信息)
        const saveRes = await fetch(`${BACKEND_URL}/save-purchase/`, {
            method: "POST",
            // *** 关键修改：移除 headers 中的 Content-Type，让浏览器自动设置 multipart/form-data ***
            body: formData, // *** 关键修改：使用 FormData 作为请求体 ***
        });

        if (!saveRes.ok) { // 如果保存请求不成功
            const errorText = await saveRes.text();
            console.error("Error from save-purchase (Response Text):", errorText);
            // 尝试解析后端返回的 JSON 错误信息，如果不是 JSON，则直接显示文本
            let errorMessage = `Save failed: ${saveRes.status}`; // 保存失败
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage += ` - ${errorJson.error || errorJson.message || 'Unknown error'}`; // 未知错误
            } catch (e) {
                errorMessage += ` - ${errorText}`;
            }
            displayErrorMessage(errorMessage); // 使用辅助函数显示错误
            resetPurchaseButton(); // 失败时重置按钮状态
            return;
        }

        const saveData = await saveRes.json();
        const groupId = saveData.group_id; // 从保存响应中获取 group_id

        // 2. 创建结账会话 (调用 Stripe 接口)
        const checkoutRes = await fetch(`${BACKEND_URL}/create-checkout-session/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }, // create-checkout-session 视图期望 JSON
            body: JSON.stringify({
                quantity: selectedCount,
                group_id: groupId,
            }),
        });

        if (!checkoutRes.ok) { // 如果创建结账会话请求不成功
             const errorText = await checkoutRes.text();
             console.error("Error from create-checkout-session (Response Text):", errorText);
             let errorMessage = `Checkout session creation failed: ${checkoutRes.status}`; // 结账会话创建失败
             try {
                 const errorJson = JSON.parse(errorText);
                 errorMessage += ` - ${errorJson.error || errorJson.message || 'Unknown error'}`; // 未知错误
             } catch (e) {
                 errorMessage += ` - ${errorText}`;
             }
             displayErrorMessage(errorMessage);
             resetPurchaseButton(); // 失败时重置按钮状态
             return;
        }

        const checkoutData = await checkoutRes.json();

        if (checkoutData.id) { // 如果成功获取到 Stripe 会话ID
            const stripe = Stripe("pk_live_51RRq7xD5KWKNltNDGFPjk0qKraRXEbqfEuxAatuweHawtj1eXaCZLoUaJ8YVzaQcwEtMF39GyV1jYGMgl2b9px4U00haH5kzzl"); // 替换为你的真实 Stripe Publishable Key

            // 添加一小段延迟，确保 Stripe JS 库完全加载和初始化
            await new Promise(r => setTimeout(r, 100));

            // 重定向到 Stripe 结账页面
            const { error } = await stripe.redirectToCheckout({ sessionId: checkoutData.id });

            if (error) { // 如果 Stripe 重定向失败
                displayErrorMessage(error.message);
                resetPurchaseButton(); // Stripe 错误时重置按钮状态
            }
            // 注意：如果成功重定向到 Stripe，resetPurchaseButton 不应该在这里被调用，
            // 因为页面会跳转。只有在重定向失败时才需要。
            // 实际上，Stripe 重定向通常是单向的，不需要在这里重置。
        } else {
            // 如果后端返回的 checkoutData 没有 id
            displayErrorMessage("Error: " + (checkoutData.error || "Unknown error during checkout session creation.")); // 创建结账会话时发生未知错误。
            resetPurchaseButton(); // 失败时重置按钮状态
        }
    } catch (error) { // 捕获整个购买流程中的任何异常
        console.error("Purchase process error:", error); // 购买流程错误
        displayErrorMessage("Purchase failed: " + error.message); // 购买失败
        resetPurchaseButton(); // 发生任何异常时重置按钮状态
    }
}


// --- 辅助函数：显示错误信息 ---
function displayErrorMessage(message) {
    errorMessageElement.textContent = message;
    errorMessageElement.style.display = 'block'; // 显示错误信息块
}

// --- 辅助函数：重置购买按钮状态 ---
function resetPurchaseButton() {
    isProcessingPurchase = false; // 重置处理标志
    purchaseButton.disabled = false; // 重新启用按钮
    purchaseButton.textContent = 'Confirm Purchase and Upload'; // 恢复按钮文本为“确认购买并上传”
}
