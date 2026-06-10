/**
 * Utility to translate technical API validation errors and backend business errors 
 * into clear, user-friendly Vietnamese messages.
 */

const fieldMapping: Record<string, string> = {
  email: "Email",
  password: "Mật khẩu",
  new_password: "Mật khẩu mới",
  full_name: "Họ và tên",
  title: "Tiêu đề",
  description: "Mô tả",
  price: "Giá",
  category_id: "Danh mục",
  condition: "Tình trạng",
  location: "Địa điểm",
  phone: "Số điện thoại",
  address: "Địa chỉ",
  comment: "Bình luận",
  rating: "Đánh giá",
  reason: "Lý do",
  name: "Tên",
  avatar_url: "Ảnh đại diện",
  bio: "Tiểu sử",
  display_name: "Tên hiển thị",
  dob: "Ngày sinh",
  shop_slug: "Đường dẫn cửa hàng",
  banner_url: "Ảnh bìa",
  scheduled_at: "Thời gian hẹn",
  tracking_code: "Mã vận đơn",
  delivery_status: "Trạng thái giao hàng",
  status: "Trạng thái",
  recipient: "Người nhận",
  subject: "Tiêu đề",
  body: "Nội dung",
  image_url: "Đường dẫn ảnh",
  resolution: "Hướng giải quyết",
};

const messageMapping: Record<string, string> = {
  // Pydantic standard validators
  "field required": "không được để trống",
  "value is not a valid email address": "không phải là địa chỉ email hợp lệ",
  "string should have at least 8 characters": "phải chứa ít nhất 8 ký tự",
  "string should have at least 6 characters": "phải chứa ít nhất 6 ký tự",
  "string should have at least 1 characters": "không được để trống",
  "input should be a valid integer": "phải là số nguyên hợp lệ",
  "input should be a valid number": "phải là số hợp lệ",
  "input should be greater than 0": "phải lớn hơn 0",
  "input should be greater than or equal to 0": "phải lớn hơn hoặc bằng 0",
  "value is not a valid float": "phải là số thập phân hợp lệ",

  // Custom backend exceptions
  "email is already registered": "Email này đã được đăng ký",
  "invalid credentials": "Email hoặc mật khẩu không chính xác",
  "shop slug is already taken": "Đường dẫn cửa hàng này đã tồn tại",
  "email address not found": "Email không tồn tại trong hệ thống",
  "invalid or expired reset token": "Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn",
  "reset token has expired": "Mã đặt lại mật khẩu đã hết hạn",
  "user is blocked": "Tài khoản của bạn đã bị khóa",
  "user not found": "Không tìm thấy người dùng",
  "listing not found": "Không tìm thấy tin đăng",
  "category not found": "Không tìm thấy danh mục",
  "deal not found": "Không tìm thấy giao dịch",
  "offer not found": "Không tìm thấy lời đề nghị",
  "meetup not found": "Không tìm thấy lịch hẹn",
  "report not found": "Không tìm thấy báo cáo vi phạm",
  "conversation not found": "Không tìm thấy cuộc trò chuyện",
  "permission denied": "Bạn không có quyền thực hiện hành động này",
  "cannot offer on own listing": "Bạn không thể gửi lời đề nghị mua cho tin đăng của chính mình",
  "offer price must be greater than zero": "Giá đề nghị phải lớn hơn 0",
  "invalid offer price": "Giá đề nghị không hợp lệ",
  "cannot follow yourself": "Bạn không thể theo dõi chính mình",
  "already following this user": "Bạn đã theo dõi người dùng này",
  "not following this user": "Bạn chưa theo dõi người dùng này",
  "dispute reason is required": "Lý do tranh chấp không được để trống",
  "resolution is required": "Phương án giải quyết không được để trống",
  "unauthorized": "Không được phép truy cập",
};

/**
 * Translates a single field-level validation message or general backend message.
 */
export function translateError(field: string | undefined, msg: string | undefined): string {
  if (!msg) {
    return "Đã xảy ra lỗi không xác định.";
  }

  const rawMsg = msg.trim();
  const lowerMsg = rawMsg.toLowerCase();

  // 1. Translate the message body
  let translatedMsg = messageMapping[lowerMsg];

  // Pattern matching for dynamic Pydantic messages
  if (!translatedMsg) {
    const atLeastMatch = rawMsg.match(/should have at least (\d+) characters/i);
    if (atLeastMatch) {
      translatedMsg = `phải chứa ít nhất ${atLeastMatch[1]} ký tự`;
    } else {
      const atMostMatch = rawMsg.match(/should have at most (\d+) characters/i);
      if (atMostMatch) {
        translatedMsg = `phải chứa tối đa ${atMostMatch[1]} ký tự`;
      } else {
        const lessThanMatch = rawMsg.match(/less than or equal to (\d+)/i);
        if (lessThanMatch) {
          translatedMsg = `phải nhỏ hơn hoặc bằng ${lessThanMatch[1]}`;
        } else {
          const greaterThanMatch = rawMsg.match(/greater than or equal to (\d+)/i);
          if (greaterThanMatch) {
            translatedMsg = `phải lớn hơn hoặc bằng ${greaterThanMatch[1]}`;
          } else {
            const emailMatch = rawMsg.match(/value is not a valid email address/i);
            if (emailMatch) {
              translatedMsg = "không phải là địa chỉ email hợp lệ";
            }
          }
        }
      }
    }
  }

  // Fallback to original message if no translation found
  translatedMsg = translatedMsg || rawMsg;

  // 2. Format the message with user-friendly field name
  if (field) {
    const cleanField = field.trim();
    const translatedField = fieldMapping[cleanField.toLowerCase()] || cleanField;

    // Build natural sentence structure. e.g. "Mật khẩu phải chứa ít nhất 8 ký tự"
    const lowerTranslatedMsg = translatedMsg.toLowerCase();
    
    // If the message starts with verbs or prepositions like "không", "phải", "đã", "chưa", just concatenate with space
    const needsConnector = !lowerTranslatedMsg.startsWith("không") && 
                           !lowerTranslatedMsg.startsWith("phải") &&
                           !lowerTranslatedMsg.startsWith("đã") &&
                           !lowerTranslatedMsg.startsWith("chưa");
    
    const connector = needsConnector ? " " : " ";
    return `${translatedField}${connector}${translatedMsg}`;
  }

  return translatedMsg;
}
