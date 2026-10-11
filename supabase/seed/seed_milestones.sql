INSERT INTO public.milestones (id, user_id, name, target_amount, display_order, is_active)
VALUES
  (gen_random_uuid(), auth.uid(), '₹1 Lakh', 100000, 1, true),
  (gen_random_uuid(), auth.uid(), '₹5 Lakh', 500000, 2, true),
  (gen_random_uuid(), auth.uid(), '₹10 Lakh', 1000000, 3, true),
  (gen_random_uuid(), auth.uid(), '₹25 Lakh', 2500000, 4, true),
  (gen_random_uuid(), auth.uid(), '₹50 Lakh', 5000000, 5, true),
  (gen_random_uuid(), auth.uid(), '₹1 Crore', 10000000, 6, true)
ON CONFLICT DO NOTHING;