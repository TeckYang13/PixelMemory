const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
document.addEventListener("DOMContentLoaded", function () {
    fetch("${BACKEND_URL}/api/leaderboard/")
        .then(response => response.json())
        .then(data => {
            const tbody = document.getElementById("leaderboard-body");
            tbody.innerHTML = "";

            data.forEach((item, index) => {
                const row = document.createElement("tr");
                const rankNumber = index + 1; // 获取排名数字

                row.innerHTML = `
                    <td class="rank" data-rank="${rankNumber}"></td> <td><a href="${item.link}" target="_blank">${item.link}</a></td>
                    <td>${item.pixel_count} pixel</td>
                `;

                tbody.appendChild(row);

                // 根据排名设置特定的颜色 (可选，也可以完全放在CSS中处理)
                const rankCell = row.querySelector('.rank');
                // 这里我们不在JS中直接设置背景色，而是让CSS通过data-rank或nth-child来处理
                // 如果你需要在JS中根据数据决定更复杂的颜色，可以在这里添加逻辑
            });
        })
        .catch(error => {
            const tbody = document.getElementById("leaderboard-body");
            tbody.innerHTML = "<tr><td colspan='3' style='color:red;'>无法加载排行榜</td></tr>";
            console.error("Error loading leaderboard:", error);
        });
});
