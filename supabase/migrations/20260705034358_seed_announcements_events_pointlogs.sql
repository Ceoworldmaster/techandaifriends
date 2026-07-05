/*
# Fix point_logs INSERT policy + seed demo data for announcements, events, point_logs
*/

-- point_logs needs INSERT policy for admin to log points
DROP POLICY IF EXISTS "point_logs_insert_admin" ON point_logs;
CREATE POLICY "point_logs_insert_admin" ON point_logs FOR INSERT
  TO authenticated WITH CHECK (is_admin(auth.uid()) OR user_id = auth.uid());

-- Seed announcements
INSERT INTO announcements (id, title, content, pinned, created_at) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Khai mạc CLB nhiệm kỳ 2025-2026', 
   'Chào mừng các thành viên đến với nhiệm kỳ mới 2025-2026! Ban chủ nhiệm sẽ công bố kế hoạch hoạt động trong tuần tới. Hãy cùng nhau xây dựng một CLB ngày càng lớn mạnh!',
   true, now() - interval '2 days'),
  ('b1000000-0000-0000-0000-000000000002', 'Workshop AI cơ bản — Đăng ký ngay',
   'CLB sẽ tổ chức Workshop AI cơ bản vào tuần tới. Nội dung: Giới thiệu Machine Learning, thực hành với Python và scikit-learn. Số lượng có hạn, đăng ký sớm!',
   true, now() - interval '1 day'),
  ('b1000000-0000-0000-0000-000000000003', 'Phát hành Tạp chí Tech & AI Số 1',
   'Số báo đầu tiên của CLB đã chính thức phát hành! Nội dung gồm: xu hướng AI 2025, review các công cụ AI mới nhất, và bài viết từ các thành viên xuất sắc.',
   false, now() - interval '5 days'),
  ('b1000000-0000-0000-0000-000000000004', 'Tuyển thành viên mới 2025-2026',
   'CLB Tech & AI Friends đang tuyển thành viên mới cho nhiệm kỳ 2025-2026! Hãy điền form đăng ký và gia nhập cộng đồng công nghệ năng động của chúng ta.',
   false, now() - interval '7 days')
ON CONFLICT (id) DO NOTHING;

-- Seed events  
INSERT INTO events (id, title, description, location, start_at, end_at, capacity, created_at) VALUES
  ('c1000000-0000-0000-0000-000000000001', 
   'Workshop: Nhập môn Machine Learning',
   'Buổi workshop thực hành dành cho người mới bắt đầu. Nội dung: supervised learning, decision tree, linear regression với Python. Mang laptop cài sẵn Python!',
   'Phòng C101 — Tòa nhà C',
   now() + interval '5 days', now() + interval '5 days' + interval '3 hours', 30,
   now() - interval '3 days'),
  ('c1000000-0000-0000-0000-000000000002',
   'Seminar: Generative AI & ChatGPT',
   'Thảo luận chuyên sâu về các mô hình ngôn ngữ lớn (LLM), ứng dụng thực tiễn của ChatGPT, Gemini trong học tập và nghiên cứu. Diễn giả: chuyên gia từ ngành công nghệ.',
   'Hội trường A — Tầng 2',
   now() + interval '12 days', now() + interval '12 days' + interval '2 hours', 80,
   now() - interval '2 days'),
  ('c1000000-0000-0000-0000-000000000003',
   'Hackathon 24h: Build with AI',
   'Cuộc thi lập trình 24 giờ sử dụng các công cụ AI để xây dựng sản phẩm thực tế. Giải thưởng hấp dẫn! Nhóm 2-4 người. Đăng ký theo nhóm.',
   'Lab Máy tính — Tòa nhà B tầng 3',
   now() + interval '20 days', now() + interval '21 days', 60,
   now() - interval '1 day'),
  ('c1000000-0000-0000-0000-000000000004',
   'Buổi gặp mặt thành viên cuối kỳ',
   'Gặp mặt tổng kết hoạt động học kỳ 1, trao giải thưởng thành viên xuất sắc, bầu ban chủ nhiệm mới và lên kế hoạch học kỳ 2.',
   'Sân trường — Khu A',
   now() - interval '10 days', now() - interval '10 days' + interval '3 hours', 100,
   now() - interval '15 days')
ON CONFLICT (id) DO NOTHING;

-- Seed point_logs for some members
DO $$
DECLARE
  m1 uuid := 'a1000000-0000-0000-0000-000000000001';
  m2 uuid := 'a1000000-0000-0000-0000-000000000002';
  m10 uuid := 'a1000000-0000-0000-0000-000000000010';
  m15 uuid := 'a1000000-0000-0000-0000-000000000015';
BEGIN
  INSERT INTO point_logs (user_id, action, amount, created_at) VALUES
    (m1,  'Tham gia Workshop ML', 50, now() - interval '10 days'),
    (m1,  'Viết bài tạp chí số 1', 100, now() - interval '8 days'),
    (m1,  'Tổ chức sự kiện Hackathon', 200, now() - interval '5 days'),
    (m1,  'Tham gia sinh hoạt CLB', 30, now() - interval '2 days'),
    (m2,  'Tham gia Workshop ML', 50, now() - interval '10 days'),
    (m2,  'Thiết kế poster sự kiện', 80, now() - interval '7 days'),
    (m2,  'Quản lý fanpage CLB', 120, now() - interval '4 days'),
    (m2,  'Tham gia sinh hoạt CLB', 30, now() - interval '2 days'),
    (m10, 'Điều phối sự kiện khai mạc', 150, now() - interval '12 days'),
    (m10, 'Tham gia Workshop ML', 50, now() - interval '10 days'),
    (m10, 'Viết bài tạp chí số 1', 100, now() - interval '8 days'),
    (m10, 'Tổ chức Seminar AI', 180, now() - interval '6 days'),
    (m10, 'Tham gia sinh hoạt CLB', 30, now() - interval '3 days'),
    (m10, 'Cố vấn dự án thành viên mới', 100, now() - interval '1 day'),
    (m15, 'Tham gia Workshop ML', 50, now() - interval '10 days'),
    (m15, 'Tham gia sinh hoạt CLB', 30, now() - interval '5 days'),
    (m15, 'Hoàn thành thử thách code', 65, now() - interval '3 days')
  ON CONFLICT DO NOTHING;
END $$;
