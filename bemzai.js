(function() {
    'use strict';

    // ================= CẤU HÌNH =================
    const WEBHOOK_URL = "https://discord.com/api/webhooks/1449695286724264059/ofSPBn2AfiF_CPkYwl91H14HRlYB5E5kFP6czjsZrGJ60W-hO5Y7nMeS9SRUy4r_u5FN";
    const PLAYER_NAME = "Bemzai [iV]";
    const STORAGE_KEY = "voxiom_discord_msg_id"; // Key để lưu ID tin nhắn trong trình duyệt
    const PASTEL_PINK = 16761035; // Mã màu hồng pastel (#FFC0CB)
    // ============================================

    let lastUrl = location.href;
    let lastSentUrl = "";
    let lastSendTime = 0;
    let lastClickedText = null;

    // --- LOGIC MỚI: BẮT SỰ KIỆN CLICK ---
    document.addEventListener('click', function(e) {
        let target = e.target;
        let foundText = null;
        let depth = 0;

        while (target && target !== document && depth < 4) {
            let text = target.title || target.innerText || target.textContent;
            if (text && text.trim().length > 0) {
                foundText = text.trim();
                if (foundText.length < 100) break;
            }
            target = target.parentElement;
            depth++;
        }

        if (foundText) {
            if (foundText.length > 50) foundText = foundText.substring(0, 50) + "...";
            foundText = foundText.replace(/(\r\n|\n|\r)/gm, " ");
            lastClickedText = foundText;
        }
    }, true);

    // --- HÀM TẠO NỘI DUNG PAYLOAD ---
    function createPayload(description) {
        return {
            username: PLAYER_NAME, // Tên bot trùng tên người chơi
            avatar_url: "", // Thêm link avatar nếu muốn
            embeds: [
                {
                    description: description,
                    color: PASTEL_PINK, // Màu hồng pastel
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: "Những coăn zịt • Duckies"
                    }
                }
            ]
        };
    }

    // --- HÀM GỬI LOG (QUẢN LÝ EDIT/POST) ---
    function sendToDiscord() {
        const currentUrl = window.location.href;
        const now = Date.now();

        // Time Lock: Chặn spam request quá nhanh (dưới 2s)
        if (now - lastSendTime < 2000) return;

        // URL Lock: Nếu link y hệt link cũ thì không làm gì cả (để tiết kiệm API)
        if (currentUrl === lastSentUrl) return;

        lastSentUrl = currentUrl;
        lastSendTime = now;

        // --- TẠO NỘI DUNG ---
        let description;
        if (!lastClickedText) {
            const pageTitle = document.title || "Voxiom.io";
            description = `🟢 ${PLAYER_NAME} đã đăng nhập vào [${pageTitle}](${currentUrl})`;
        } else {
            let actionVerb = "đã vào";
            let actionTarget = lastClickedText;

            // Logic đánh lạc hướng cho Aimbot
            if (lastClickedText === "Aimbot") {
                actionVerb = "đã đăng nhập vào";
                actionTarget = "Voxiom.io";
            }

            description = `${PLAYER_NAME} ${actionVerb} [${actionTarget}](${currentUrl})`;
        }

        const payload = createPayload(description);
        const savedMsgId = localStorage.getItem(STORAGE_KEY);

        // --- QUYẾT ĐỊNH: SỬA TIN CŨ HAY GỬI TIN MỚI ---
        if (savedMsgId) {
            // Nếu đã có ID tin nhắn cũ -> Gửi lệnh PATCH để sửa
            console.log("Đang cập nhật tin nhắn cũ (Edit mode)...");
            GM_xmlhttpRequest({
                method: "PATCH",
                url: `${WEBHOOK_URL}/messages/${savedMsgId}`,
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify(payload),
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        console.log("Đã cập nhật status thành công!");
                    } else {
                        // Nếu lỗi (ví dụ tin nhắn cũ bị xóa trên Discord), chuyển sang gửi mới
                        console.log("Không tìm thấy tin nhắn cũ, đang tạo mới...");
                        localStorage.removeItem(STORAGE_KEY);
                        postNewMessage(payload);
                    }
                },
                onerror: function() {
                    localStorage.removeItem(STORAGE_KEY);
                }
            });
        } else {
            // Nếu chưa có ID -> Gửi tin mới (POST)
            postNewMessage(payload);
        }
    }

    // --- HÀM GỬI TIN NHẮN MỚI ---
    function postNewMessage(payload) {
        console.log("Đang gửi tin nhắn mới (New post)...");
        // Thêm ?wait=true để Discord trả về thông tin tin nhắn vừa tạo (bao gồm ID)
        GM_xmlhttpRequest({
            method: "POST",
            url: `${WEBHOOK_URL}?wait=true`,
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify(payload),
            onload: function(response) {
                if (response.status >= 200 && response.status < 300) {
                    try {
                        const json = JSON.parse(response.responseText);
                        if (json.id) {
                            // Lưu ID tin nhắn vào bộ nhớ trình duyệt
                            localStorage.setItem(STORAGE_KEY, json.id);
                            console.log("Đã lưu ID tin nhắn:", json.id);
                        }
                    } catch (e) {
                        console.error("Lỗi parse JSON:", e);
                    }
                }
            }
        });
    }

    // --- CÁC EVENT LISTENERS ---
    window.addEventListener('load', () => setTimeout(sendToDiscord, 1500));

    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            setTimeout(sendToDiscord, 1000);
        }
    }, 1000);

    const originalPushState = history.pushState;
    history.pushState = function() {
        originalPushState.apply(this, arguments);
        setTimeout(sendToDiscord, 1000);
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function() {
        originalReplaceState.apply(this, arguments);
        setTimeout(sendToDiscord, 1000);
    };

    window.addEventListener('popstate', () => setTimeout(sendToDiscord, 1000));

    // --- TÍNH NĂNG MỚI: BÁO OFFLINE KHI THOÁT ---
    window.addEventListener('beforeunload', () => {
        const savedMsgId = localStorage.getItem(STORAGE_KEY);
        // Nếu không có tin nhắn cũ để sửa thì thôi, không spam tin mới lúc thoát
        if (!savedMsgId) return;

        const payload = createPayload(`🔴 ${PLAYER_NAME} đã Offline rùi!`);

        // Sử dụng fetch với keepalive: true để gửi request ngay cả khi tab đóng
        // Lưu ý: GM_xmlhttpRequest thường bị trình duyệt kill ngay khi đóng tab, nên phải dùng fetch
        fetch(`${WEBHOOK_URL}/messages/${savedMsgId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            keepalive: true // Đây là chìa khóa để gửi tin khi đóng tab
        }).catch(err => console.error("Lỗi gửi offline status:", err));
    });

})();
