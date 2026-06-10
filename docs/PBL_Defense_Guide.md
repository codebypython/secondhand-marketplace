# HƯỚNG DẪN BẢO VỆ ĐỒ ÁN PBL & ĐỐI ĐÁP PHẢN BIỆN CHUYÊN SÂU
## ĐỀ TÀI: SÀN GIAO DỊCH ĐỒ CŨ (SECONDHAND MARKETPLACE)
### HỌC PHẦN: ĐỒ ÁN PBL 3 / PBL 5 - KHOA CÔNG NGHỆ THÔNG TIN - ĐH BÁCH KHOA ĐN

Tài liệu này được biên soạn nhằm chuẩn bị cho nhóm phát triển phương án báo cáo, trình diễn (Demo) ứng dụng và đối đáp phản biện trực tiếp trước Hội đồng chấm Đồ án của Khoa CNTT, Trường Đại học Bách khoa - Đại học Đà Nẵng. Tài liệu đi sâu vào các câu hỏi lý thuyết cốt lõi về **Thiết kế hướng đối tượng (OOAD)** và **Lập trình mạng (Network Programming)** dựa trên mã nguồn thực tế của hệ thống.

---

## PHẦN 1: KẾ CHƯƠNG TRÌNH TRÌNH BÀY & DEMO SẢN PHẨM (10-15 PHÚT)

Để thuyết phục Hội đồng, nhóm cần phân bổ thời gian hợp lý và làm nổi bật các giá trị kỹ thuật cốt lõi thay vì đi sâu vào các chức năng quá cơ bản (như CRUD thông thường).

```
 0 - 3 Phút            3 - 8 Phút                 8 - 12 Phút               12 - 15 Phút
+------------+  +----------------------+  +-------------------------+  +--------------------+
|  Giới thiệu|  |  Kiến trúc & OOAD    |  |     Kịch bản Demo       |  |  Tổng kết & Hướng  |
|  Slide     |  | - Sơ đồ 4+1 Views    |  | - Mở 2 Browser (Mua/Bán)|  |  phát triển        |
| - Đặt vấn đề|  | - Thiết kế Database  |  | - Chat Realtime         |  | - Tải lượng        |
| - Mục tiêu |  | - Mixins & OCC Lock  |  | - Trả giá -> Tạo Deal   |  | - Kết luận         |
+------------+  +----------------------+  +-------------------------+  +--------------------+
```

### Kịch bản Demo thực tế (Live Demo):
1. **Chuẩn bị:** Mở song song hai trình duyệt khác nhau (ví dụ: Google Chrome cho Buyer A và Microsoft Edge cho Seller B) đã đăng nhập sẵn.
2. **Bước 1 (Đăng tin & Vị trí):** Seller B thực hiện đăng một sản phẩm mới. Cho hội đồng thấy việc chọn vị trí giao dịch trên bản đồ động Leaflet và lưu thông tin tọa độ dưới dạng JSONB.
3. **Bước 2 (Tìm kiếm & Bộ lọc):** Buyer A tìm kiếm sản phẩm vừa đăng bằng debounced search và lọc theo khoảng giá/danh mục. Nhấn thích sản phẩm (Favorite).
4. **Bước 3 (Chat Real-time):** Buyer A nhấn Chat. Hai màn hình hiển thị hội thoại tức thời qua WebSocket.
5. **Bước 4 (Đề xuất trả giá & Tạo Deal):** Buyer A gửi đề xuất mua với giá thấp hơn (Offer PENDING). Seller B nhận được thông tin trả giá tức thời. Seller B nhấn **Chấp nhận (Accept)**. Show cho thầy cô thấy tin đăng lập tức chuyển sang trạng thái **Đã giữ chỗ (RESERVED)** và các offer khác tự động bị từ chối.
6. **Bước 5 (Lên lịch Meetup & Hoàn thành):** Tạo một lịch hẹn gặp mặt (Meetup). Sau đó nhấn xác nhận hoàn thành giao dịch (Completed) để chuyển sản phẩm sang trạng thái **Đã bán (SOLD)**.

---

## PHẦN 2: KỊCH BẢN ĐỐI ĐÁP & PHẢN BIỆN TRƯỚC HỘI ĐỒNG (Q&A)

Dưới đây là các câu hỏi thường gặp nhất từ các thầy cô trong Hội đồng phản biện Khoa CNTT - DUT và các câu trả lời kỹ thuật chuẩn xác liên kết trực tiếp với mã nguồn.

### Nhóm 1: Câu hỏi về Thiết kế & Lập trình hướng đối tượng (OOAD)

#### Câu hỏi 1.1: Tại sao các em lại sử dụng UUID thay vì Integer cho các khóa chính trong cơ sở dữ liệu? Cách triển khai trong code như thế nào?
* **Mục đích của thầy cô:** Kiểm tra kiến thức về bảo mật cơ sở dữ liệu, che giấu thông tin hệ thống (Information Hiding) và thiết kế hệ thống phân tán.
* **Trả lời phản biện:**
  > "Dạ thưa thầy/cô, việc sử dụng Integer tự tăng (Auto-increment) có nhược điểm lớn về mặt bảo mật. Kẻ xấu có thể dự đoán được ID của các thực thể tiếp theo (Sequential ID Guessing), từ đó thực hiện quét dữ liệu (Data Scraping) hoặc tấn công dò đoán tài nguyên (IDOR).
  > Ngoài ra, khi hệ thống cần mở rộng ngang (Horizontal Scaling) hoặc phân tán dữ liệu, ID tự tăng sẽ dễ bị xung đột. Do đó nhóm sử dụng UUID v4 (128-bit ngẫu nhiên) để đảm bảo tính duy nhất toàn cục.
  > Trong code, tại [mixins.py](file:///d:/User/Workspace/secondhand-marketplace/backend/app/models/mixins.py#L32-L33), nhóm định nghĩa lớp `UUIDMixin` kế thừa thuộc tính `id` kiểu dữ liệu UUIDSqlType và tự động phát sinh bằng hàm `uuid.uuid4`. Tất cả các Model chính như `User`, `Listing`, `Offer`, `Deal` đều kế thừa từ mixin này."

#### Câu hỏi 1.2: Các em giải thích khái niệm Mixin và tính kế thừa (Inheritance) trong tầng cơ sở dữ liệu ở đây là gì?
* **Mục đích của thầy cô:** Kiểm tra sự hiểu biết về tính tái sử dụng mã nguồn (Reusability) và Đa kế thừa (Multiple Inheritance) trong thiết kế Class.
* **Trả lời phản biện:**
  > "Dạ thưa thầy/cô, Mixin là một lớp thiết kế đặc biệt dùng để cung cấp các thuộc tính và phương thức có thể tái sử dụng cho các lớp khác mà không đóng vai trò làm lớp cha trực tiếp của chúng. Điều này giúp tránh được hiện tượng đa kế thừa phức tạp (Multiple Inheritance / Diamond Problem).
  > Trong hệ thống, nhóm xây dựng 4 Mixin chính tại [mixins.py](file:///d:/User/Workspace/secondhand-marketplace/backend/app/models/mixins.py):
  > 1. `UUIDMixin`: Cung cấp khóa chính UUID ngẫu nhiên.
  > 2. `TimestampMixin`: Tự động cập nhật thời gian tạo (`created_at`) và thời gian cập nhật (`updated_at`).
  > 3. `SoftDeleteMixin`: Triển khai thuộc tính `deleted_at` phục vụ cơ chế xóa mềm.
  > 4. `VersionMixin`: Chứa trường `version_id` hỗ trợ khóa lạc quan (OCC).
  > Một Model như `Listing` tại [listing.py](file:///d:/User/Workspace/secondhand-marketplace/backend/app/models/listing.py#L34) sẽ kế thừa đồng thời từ nhiều Mixins này để thừa hưởng toàn bộ các tính năng cơ sở mà không cần viết lại mã nguồn."

#### Câu hỏi 1.3: Làm thế nào để giải quyết vấn đề tranh chấp dữ liệu khi hai người mua cùng nhấn chấp nhận giao dịch hoặc sửa đổi sản phẩm đồng thời?
* **Mục đích của thầy cô:** Kiểm tra kiến thức về đồng thời (Concurrency Control) trong Cơ sở dữ liệu và OOAD.
* **Trả lời phản biện:**
  > "Dạ thưa thầy/cô, để tối ưu hóa hiệu năng, nhóm không sử dụng Khóa bi quan (Pessimistic Locking - gây khóa bảng, khóa dòng lâu dẫn đến nghẽn cổ chai) mà áp dụng cơ chế **Khóa lạc quan (Optimistic Concurrency Control - OCC)**.
  > Cơ chế này hoạt động dựa trên số hiệu phiên bản (`version_id`).
  > - Khi đọc dữ liệu, hệ thống lấy ra `version_id` hiện tại (ví dụ: `1`).
  > - Khi ghi đè (Update), ORM tự động sinh câu lệnh SQL kiểm tra điều kiện `WHERE id = ... AND version_id = 1` và tăng giá trị phiên bản lên `2`.
  > - Nếu có một tiến trình khác đã sửa đổi bản ghi này trước đó làm số hiệu phiên bản tăng lên `2`, câu lệnh cập nhật của tiến trình thứ hai sẽ cập nhật thất bại (0 dòng bị ảnh hưởng). SQLAlchemy ORM lập tức ném ra ngoại lệ `StaleDataError`, hệ thống sẽ rollback giao dịch và thông báo cho người dùng thực hiện lại.
  > Thiết lập này được nhóm khai báo tập trung trong lớp `VersionMixin` ở [mixins.py](file:///d:/User/Workspace/secondhand-marketplace/backend/app/models/mixins.py#L79-L81) với cờ `version_id_col` tích hợp sâu trong SQLAlchemy ORM."

#### Câu hỏi 1.4: Tính Đóng gói (Encapsulation) được thể hiện như thế nào trong các Model nghiệp vụ thay vì mô hình Anemic Domain Model?
* **Mục đích của thầy cô:** Phân biệt giữa mô hình thiết kế tên miền nghèo nàn (chỉ có Getter/Setter và viết toàn bộ logic trong Controller/Service) và mô hình tên miền giàu có (Rich Domain Model - chuẩn OOP thực thụ).
* **Trả lời phản biện:**
  > "Dạ thưa thầy/cô, hệ thống của nhóm tuân thủ triệt để nguyên lý Đóng gói bằng cách đưa toàn bộ các quy tắc nghiệp vụ (Business Invariants) và chuyển đổi trạng thái (State Transitions) vào bên trong chính đối tượng Model, thay vì viết chúng ở ngoài API Controller.
  > Ví dụ cụ thể trong lớp `Offer` tại [transaction.py](file:///d:/User/Workspace/secondhand-marketplace/backend/app/models/transaction.py#L52-L65):
  > Phương thức `accept()` tự chịu trách nhiệm kiểm tra xem Offer đó có đang ở trạng thái `PENDING` hay không, và tin đăng đó có đang `AVAILABLE` hay không. Nếu hợp lệ, nó tự chuyển trạng thái của chính mình thành `ACCEPTED`, ra lệnh cho listing chuyển trạng thái thành `RESERVED` (`self.listing.reserve()`), rồi khởi tạo và trả về đối tượng `Deal` mới.
  > Việc đóng gói này giúp đảm bảo dữ liệu luôn ở trạng thái nhất quán và dễ dàng viết các bài kiểm thử đơn vị (Unit Test) cho logic nghiệp vụ."

---

### Nhóm 2: Câu hỏi về Lập trình mạng (Network Programming)

#### Câu hỏi 2.1: Các em hãy trình bày kiến trúc xử lý kết nối WebSocket thời gian thực của ứng dụng?
* **Mục đích của thầy cô:** Kiểm tra sự hiểu biết về giao thức mạng WebSocket, cách duy trì kết nối bền vững và cấu trúc quản lý Client Connection.
* **Trả lời phản biện:**
  > "Dạ thưa thầy/cô, hệ thống chat thời gian thực hoạt động trên mô hình Client-Server sử dụng kết nối bền vững WebSocket (giao thức `ws://` hoặc `wss://`).
  > Luồng hoạt động của kết nối như sau:
  > 1. Phía Server định nghĩa một `ConnectionManager` tại [chat.py](file:///d:/User/Workspace/secondhand-marketplace/backend/app/api/v1/endpoints/chat.py#L91) chịu trách nhiệm quản lý các Socket đang hoạt động thông qua một cấu trúc từ điển `active_connections: Dict[str, WebSocket]` ánh xạ từ `user_id` sang thực thể kết nối WebSocket tương ứng.
  > 2. Khi Client muốn kết nối, nó gửi một HTTP Request nâng cấp giao thức (Protocol Upgrade Request) đến URL `/ws/{token}`.
  > 3. Server nhận Request, thực hiện giải mã JWT Token để xác thực danh tính người dùng trước khi chấp nhận kết nối bằng lệnh `await websocket.accept()`.
  > 4. Sau khi kết nối thành công, đối tượng Socket được lưu vào `active_connections`.
  > 5. Một vòng lặp vô hạn `while True` được duy trì để lắng nghe thông điệp gửi lên từ Client qua hàm `await websocket.receive_text()`. Khi kết nối bị đứt, ngoại lệ `WebSocketDisconnect` được bắt để thực hiện ngắt kết nối và giải phóng tài nguyên khỏi bộ nhớ."

#### Câu hỏi 2.2: Làm sao hệ thống phân phối tin nhắn đến đúng người dùng đích và xử lý thế nào khi người dùng đó không online?
* **Mục đích của thầy cô:** Đánh giá giải pháp định tuyến tin nhắn (Message Routing) và lưu vết trạng thái mạng.
* **Trả lời phản biện:**
  > "Dạ thưa thầy/cô, khi User A gửi một tin nhắn thuộc Conversation X cho User B qua WebSocket:
  > 1. Server nhận được một JSON payload dạng `{"type": "chat_message", "conversation_id": "...", "content": "..."}`.
  > 2. Server mở một Database Session ngắn, kiểm tra xem User A có phải là thành viên hợp lệ của cuộc hội thoại X hay không để tránh giả mạo tin nhắn.
  > 3. Server lưu tin nhắn mới vào bảng `messages` trong cơ sở dữ liệu để đảm bảo tin nhắn không bao giờ bị thất lạc (Persistency).
  > 4. Hệ thống lấy ra danh sách các ID thành viên tham gia hội thoại (gồm User A và User B).
  > 5. Server duyệt qua danh sách ID này: Gọi hàm `manager.send_personal_message(payload, user_id)` để tìm kiếm Socket tương ứng trong từ điển `active_connections`. Nếu tìm thấy (tức là User B đang online), Server sẽ chuyển tiếp tin nhắn qua phương thức `send_json()`. Nếu không tìm thấy (tức User B offline), tin nhắn đã được lưu trữ an toàn trong DB và sẽ được tải lại khi User B đăng nhập vào ứng dụng."

#### Câu hỏi 2.3: Các tin nhắn báo hiệu WebRTC (`rtc_offer`, `rtc_answer`, `rtc_ice_candidate`) trong WebSocket dùng để làm gì?
* **Mục đích của thầy cô:** Kiểm tra sự hiểu biết về giao thức truyền tải đa phương tiện thời gian thực (P2P Streaming / Calling) và vai trò của Server trung gian (Signaling Server).
* **Trả lời phản biện:**
  > "Dạ thưa thầy/cô, để hỗ trợ giao tiếp đa phương tiện trực tiếp giữa hai trình duyệt (Peer-to-Peer) mà không cần truyền dữ liệu video/audio nặng qua Server, hệ thống áp dụng công nghệ **WebRTC (Web Real-Time Communication)**.
  > Tuy nhiên, trước khi hai trình duyệt có thể kết nối P2P trực tiếp, chúng cần trao đổi các thông tin cấu hình mạng và định dạng truyền phát. Quá trình này gọi là **Thiết lập báo hiệu (Signaling)**.
  > WebSocket Server của chúng em đóng vai trò là một **Signaling Server**. Tại [chat.py](file:///d:/User/Workspace/secondhand-marketplace/backend/app/api/v1/endpoints/chat.py#L195-L205):
  > Khi Server nhận được thông điệp có định dạng `rtc_offer`, `rtc_answer` hoặc `rtc_ice_candidate` từ một Client, nó không lưu vào database mà chỉ đóng vai trò là một Proxy trung gian, định tuyến và chuyển tiếp nguyên vẹn dữ liệu kỹ thuật đó tới người nhận đích thông qua hàm `manager.send_personal_message()`. Khi quá trình trao đổi báo hiệu thành công, hai trình duyệt sẽ tự thiết lập kênh truyền tải video/audio trực tiếp với nhau."

#### Câu hỏi 2.4: Giao thức WebSocket hoạt động trên tầng nào trong mô hình OSI? Tại sao không dùng HTTP thông thường cho tính năng chat?
* **Mục đích của thầy cô:** Kiểm tra kiến thức mạng cơ bản ở mức độ hàn lâm.
* **Trả lời phản biện:**
  > "Dạ thưa thầy/cô, giao thức WebSocket hoạt động ở **Tầng ứng dụng (Application Layer)** trong mô hình OSI và sử dụng giao thức **TCP** ở tầng vận chuyển (Transport Layer) để đảm bảo truyền tải gói tin tin cậy, không bị mất mát hay đảo lộn thứ tự.
  > Chúng em không dùng HTTP thông thường cho tính năng chat bởi vì HTTP hoạt động theo cơ chế **Request-Response một chiều (Half-duplex)** và không có trạng thái (Stateless).
  > Nếu dùng HTTP, Client phải liên tục thực hiện cơ chế Polling (gửi request liên tục sau mỗi vài giây để hỏi xem có tin nhắn mới không), việc này gây lãng phí tài nguyên mạng rất lớn (HTTP Header overhead) và tạo độ trễ cao.
  > Trong khi đó, WebSocket sau khi hoàn thành bắt tay (Handshake) sẽ thiết lập một kênh truyền **Song công toàn phần (Full-duplex)** ổn định. Cả Client và Server đều có thể chủ động đẩy dữ liệu cho nhau bất kỳ lúc nào với độ trễ cực thấp và tiêu hao băng thông tối thiểu."

---

## PHẦN 3: KIẾN THỨC CỐT LÕI VỀ CÔNG NGHỆ & MÃ NGUỒN ÁP DỤNG

Dưới đây là bảng tra cứu nhanh vị trí mã nguồn giải quyết các bài toán cụ thể để sinh viên có thể tự tin mở code trực tiếp cho thầy cô xem khi được yêu cầu:

| Vấn đề kỹ thuật | Giải pháp áp dụng | Vị trí file mã nguồn | Dòng code tiêu biểu |
|:---|:---|:---|:---|
| **Ràng buộc giá tiền** | SQL Check Constraint | [transaction.py](file:///d:/User/Workspace/secondhand-marketplace/backend/app/models/transaction.py) | `CheckConstraint("price >= 0")` |
| **Xác thực mạng** | JWT Decode & Validation | [chat.py](file:///d:/User/Workspace/secondhand-marketplace/backend/app/api/v1/endpoints/chat.py) | `user_id = decode_access_token(token)` |
| **Xóa mềm (Soft Delete)** | Event Listener + Mixin | [mixins.py](file:///d:/User/Workspace/secondhand-marketplace/backend/app/models/mixins.py) | `deleted_at: Mapped[datetime \| None]` |
| **Tranh chấp đồng thời** | Version Column | [mixins.py](file:///d:/User/Workspace/secondhand-marketplace/backend/app/models/mixins.py) | `__mapper_args__ = {"version_id_col": version_id}` |
| **WebRTC Signaling** | Connection Routing | [chat.py](file:///d:/User/Workspace/secondhand-marketplace/backend/app/api/v1/endpoints/chat.py) | `if msg_type in ("rtc_offer", "rtc_answer", ...)` |
| **Giữ chỗ sản phẩm** | Domain Logic Transaction | [transaction.py](file:///d:/User/Workspace/secondhand-marketplace/backend/app/models/transaction.py) | `self.listing.reserve()` |
| **Tọa độ địa lý** | JSONB PostgreSQL Type | [listing.py](file:///d:/User/Workspace/secondhand-marketplace/backend/app/models/listing.py) | `location_data: Mapped[dict[str, Any] \| None]` |

---

## PHẦN 4: LỜI KHUYÊN KHI BẢO VỆ ĐỒ ÁN
1. **Phong thái tự tin và trung thực:** Nếu gặp câu hỏi quá khó hoặc không nhớ vị trí code, hãy thành thật trả lời: *"Dạ thưa thầy/cô, nội dung này nhóm có nghiên cứu và hiện thực nhưng tại thời điểm này em chưa nhớ rõ chi tiết thuật toán. Nhóm xin phép ghi nhận và sẽ bổ sung câu trả lời gửi đến thầy cô sau buổi bảo vệ ạ."*
2. **Làm nổi bật tính ứng dụng của UML:** Khi trình bày Chương 3, hãy giải thích cách nhóm ánh xạ từ biểu đồ Use Case sang Class Diagram, rồi ánh xạ trực tiếp thành các Model trong SQLAlchemy DB. Điều này chứng minh quy trình OOAD chuyên nghiệp.
3. **Giải thích rõ cơ chế Async:** Luôn nhấn mạnh từ khóa **Asynchronous (Bất đồng bộ)** khi nói về FastAPI và WebSocket, vì đây là điểm mạnh của hệ thống giúp tiết kiệm tài nguyên RAM/CPU khi xử lý hàng ngàn kết nối chat đồng thời.
