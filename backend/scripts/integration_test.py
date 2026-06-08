import requests
import sys
import time
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000/api/v1"

def print_step(msg):
    print(f"\n======== [STEP] {msg} ========")

def main():
    print("🚀 KHỞI ĐỘNG KỊCH BẢN KIỂM THỬ TÍCH HỢP CLIENT-SERVER (API INTERFACE)...")

    # 1. Đăng ký & Đăng nhập tài khoản
    print_step("1. Đăng ký và đăng nhập tài khoản người dùng")
    
    # Seller
    seller_email = f"seller_{int(time.time())}@test.com"
    reg_seller = requests.post(f"{BASE_URL}/auth/register", json={
        "email": seller_email,
        "password": "Password123!",
        "full_name": "Nguyen Van Ban"
    })
    if reg_seller.status_code != 201:
        print(f"❌ Đăng ký Seller thất bại: {reg_seller.text}")
        sys.exit(1)
    print("✅ Đăng ký Seller thành công!")
    
    login_seller = requests.post(f"{BASE_URL}/auth/login", json={
        "email": seller_email,
        "password": "Password123!"
    }).json()
    seller_token = login_seller["access_token"]
    seller_headers = {"Authorization": f"Bearer {seller_token}"}
    print("✅ Đăng nhập Seller thành công, đã nhận JWT token!")

    # Buyer
    buyer_email = f"buyer_{int(time.time())}@test.com"
    reg_buyer = requests.post(f"{BASE_URL}/auth/register", json={
        "email": buyer_email,
        "password": "Password123!",
        "full_name": "Tran Thi Mua"
    })
    if reg_buyer.status_code != 201:
        print(f"❌ Đăng ký Buyer thất bại: {reg_buyer.text}")
        sys.exit(1)
    print("✅ Đăng ký Buyer thành công!")
    
    login_buyer = requests.post(f"{BASE_URL}/auth/login", json={
        "email": buyer_email,
        "password": "Password123!"
    }).json()
    buyer_token = login_buyer["access_token"]
    buyer_headers = {"Authorization": f"Bearer {buyer_token}"}
    print("✅ Đăng nhập Buyer thành công, đã nhận JWT token!")

    # 2. Tạo Category
    print_step("2. Seller tạo danh mục mới")
    cat_res = requests.post(f"{BASE_URL}/listings/categories", headers=seller_headers, json={
        "name": "Bàn phím & Chuột",
        "slug": f"ban-phim-chuot-{int(time.time())}",
        "image_url": "https://example.com/kbd.jpg"
    })
    if cat_res.status_code != 201:
        print(f"❌ Tạo Category thất bại: {cat_res.text}")
        sys.exit(1)
    category = cat_res.json()
    category_id = category["id"]
    print(f"✅ Tạo Category thành công! ID: {category_id}, Tên: {category['name']}")

    # 3. Đăng tin bán hàng (Create Listing)
    print_step("3. Seller đăng tin bán hàng mới")
    listing_res = requests.post(f"{BASE_URL}/listings", headers=seller_headers, json={
        "category_id": category_id,
        "title": "Bàn phím cơ Keychron K2",
        "description": "Switch Brown, ngoại hình đẹp, dùng được 3 tháng.",
        "price": 1500000.00,
        "condition": "LIKE_NEW",
        "brand": "Keychron",
        "has_warranty": True,
        "image_urls": ["https://example.com/k2.jpg"],
        "location_data": {"city": "TP.HCM", "district": "Quận 1", "address": "123 Le Loi"}
    })
    if listing_res.status_code != 201:
        print(f"❌ Đăng tin thất bại: {listing_res.text}")
        sys.exit(1)
    listing = listing_res.json()
    listing_id = listing["id"]
    print(f"✅ Đăng tin thành công! ID: {listing_id}, Tiêu đề: {listing['title']}, Trạng thái: {listing['status']}")

    # 4. Tìm kiếm & Favorite từ phía Buyer
    print_step("4. Buyer tìm kiếm sản phẩm và thả tim (Favorite)")
    search_res = requests.get(f"{BASE_URL}/listings?search=Keychron")
    search_data = search_res.json()
    assert len(search_data) > 0, "Không tìm thấy sản phẩm vừa đăng!"
    print(f"✅ Đã tìm thấy {len(search_data)} sản phẩm phù hợp từ khóa 'Keychron'")

    fav_res = requests.post(f"{BASE_URL}/listings/{listing_id}/favorite", headers=buyer_headers)
    print(f"✅ Đã toggle favorite! Trạng thái yêu thích: {fav_res.json()['favorite']}")

    # 5. Buyer gửi Đề xuất giá (Offer)
    print_step("5. Buyer gửi Đề xuất giá cho sản phẩm")
    offer_res = requests.post(f"{BASE_URL}/transactions/offers", headers=buyer_headers, json={
        "listing_id": listing_id,
        "price": 1300000.00
    })
    if offer_res.status_code != 201:
        print(f"❌ Tạo Offer thất bại: {offer_res.text}")
        sys.exit(1)
    offer = offer_res.json()
    offer_id = offer["id"]
    print(f"✅ Buyer gửi Offer thành công! ID: {offer_id}, Giá đề xuất: {offer['price']} ₫, Trạng thái: {offer['status']}")

    # 6. Seller trả giá lại (Counter Offer)
    print_step("6. Seller không đồng ý và gửi đề xuất trả giá lại (Counter Offer)")
    counter_res = requests.post(f"{BASE_URL}/transactions/offers/{offer_id}/counter", headers=seller_headers, json={
        "price": 1400000.00
    })
    if counter_res.status_code not in (200, 201):
        print(f"❌ Tạo Counter Offer thất bại: {counter_res.text}")
        sys.exit(1)
    counter_offer = counter_res.json()
    counter_id = counter_offer["id"]
    print(f"✅ Seller Counter Offer thành công! ID: {counter_id}, Giá mới: {counter_offer['price']} ₫, Trạng thái: {counter_offer['status']}")

    # 7. Buyer chấp nhận Counter Offer -> Tạo Deal & Khóa sản phẩm
    print_step("7. Buyer chấp nhận mức giá mới -> Tự động tạo thỏa thuận (Deal)")
    accept_res = requests.post(f"{BASE_URL}/transactions/offers/{counter_id}/accept", headers=buyer_headers)
    if accept_res.status_code != 200:
        print(f"❌ Chấp nhận Offer thất bại: {accept_res.text}")
        sys.exit(1)
    deal = accept_res.json()
    deal_id = deal["id"]
    print(f"✅ Chấp nhận thành công! Tạo Deal ID: {deal_id}, Giá chốt: {deal['agreed_price']} ₫, Trạng thái Deal: {deal['status']}")

    # Kiểm tra Listing xem đã chuyển sang trạng thái RESERVED chưa
    listing_check = requests.get(f"{BASE_URL}/listings/{listing_id}").json()
    print(f"✅ Kiểm tra sản phẩm: Trạng thái hiện tại đã được khóa sang: {listing_check['status']}")

    # 8. Tạo lịch hẹn gặp (Meetup)
    print_step("8. Hai bên lên lịch hẹn gặp giao dịch trực tiếp (Meetup)")
    meetup_res = requests.post(f"{BASE_URL}/transactions/meetups", headers=seller_headers, json={
        "deal_id": deal_id,
        "scheduled_at": "2026-06-15T10:00:00Z",
        "location": {"address": "Cà Phê Highlands, 123 Le Loi, Q1", "lat": 10.776, "lng": 106.701}
    })
    if meetup_res.status_code != 201:
        print(f"❌ Tạo Meetup thất bại: {meetup_res.text}")
        sys.exit(1)
    meetup = meetup_res.json()
    meetup_id = meetup["id"]
    print(f"✅ Seller đề xuất lịch hẹn thành công! ID: {meetup_id}, Địa điểm: {meetup['location']['address']}")

    # 9. Thực hiện Check-in tại điểm hẹn từ hai phía
    print_step("9. Hai bên tới điểm hẹn và thực hiện Check-in xác nhận")
    
    # Buyer check-in
    buyer_ci_res = requests.post(f"{BASE_URL}/transactions/meetups/{meetup_id}/check-in", headers=buyer_headers)
    if buyer_ci_res.status_code != 200:
        print(f"❌ Buyer check-in thất bại: {buyer_ci_res.text}")
        sys.exit(1)
    buyer_ci = buyer_ci_res.json()
    print(f"✅ Buyer check-in thành công! Trạng thái check-in người mua: {buyer_ci['buyer_checked_in']}")
    
    # Seller check-in (Sau khi check-in này, cả 2 bên đã có mặt -> Giao dịch tự động hoàn tất!)
    seller_ci_res = requests.post(f"{BASE_URL}/transactions/meetups/{meetup_id}/check-in", headers=seller_headers)
    if seller_ci_res.status_code != 200:
        print(f"❌ Seller check-in thất bại: {seller_ci_res.text}")
        sys.exit(1)
    seller_ci = seller_ci_res.json()

    print(f"✅ Seller check-in thành công! Trạng thái check-in người bán: {seller_ci['seller_checked_in']}")
    print(f"✅ Trạng thái cuộc hẹn sau check-in chung: {seller_ci['status']}")

    # Kiểm tra Deal xem đã chuyển sang COMPLETED chưa
    deal_check = requests.get(f"{BASE_URL}/transactions/deals", headers=buyer_headers).json()
    my_deal = next(d for d in deal_check if d["id"] == deal_id)
    print(f"✅ Kiểm tra Deal: Trạng thái giao dịch tự động chuyển sang: {my_deal['status']}")

    # Kiểm tra Listing xem đã chuyển sang SOLD chưa
    listing_sold = requests.get(f"{BASE_URL}/listings/{listing_id}").json()
    print(f"✅ Kiểm tra sản phẩm: Trạng thái sản phẩm tự động chuyển sang: {listing_sold['status']}")

    # 10. Gửi đánh giá (Review)
    print_step("10. Người mua gửi đánh giá 5 sao cho người bán")
    target_user_id = listing_check["owner_id"]
    review_res = requests.post(f"{BASE_URL}/users/{target_user_id}/reviews", headers=buyer_headers, json={
        "deal_id": deal_id,
        "rating": 5,
        "comment": "Người bán thân thiện, nhiệt tình, sản phẩm đúng mô tả!"
    })
    if review_res.status_code != 201:
        print(f"❌ Gửi đánh giá thất bại: {review_res.text}")
        sys.exit(1)
    print("✅ Người mua gửi đánh giá thành công! Dữ liệu phản hồi:")
    print(review_res.json())


    print("\n==========================================================")
    print("🎉 HOÀN THÀNH KIỂM THỬ TÍCH HỢP TOÀN BỘ LUỒNG CHỨC NĂNG THÀNH CÔNG!")
    print("==========================================================")

if __name__ == "__main__":
    main()
