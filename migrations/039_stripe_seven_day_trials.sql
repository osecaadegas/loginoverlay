-- Align stored premium content with the card-required Stripe Checkout trial.
-- Historical user_trials rows are retained to prevent repeat trial eligibility.

UPDATE public.subscription_page_content
SET content = content || jsonb_build_object(
      'hero_description', 'Start eligible monthly plans with 7 days free. Add a payment method in Stripe Checkout and paid billing begins automatically after the trial unless canceled.',
      'trial_heading', '7-day monthly trial',
      'trial_description', 'Eligible new customers can try a monthly plan free for 7 days. A payment method is required.',
      'trial_supporting', 'Cancel through the Stripe billing portal before the trial ends to avoid the first recurring charge.',
      'trust_labels', jsonb_build_array('7 days free', 'Secure Stripe checkout', 'Cancel before renewal'),
      'primary_cta', 'Start 7-day trial',
      'legal_note', 'Monthly Stripe trials require a payment method and convert automatically to recurring paid subscriptions after 7 days unless canceled.',
      'faq', jsonb_build_array(
        jsonb_build_object('question', 'Does the trial require a card?', 'answer', 'Yes. Stripe Checkout collects a payment method for billing after the 7-day trial.'),
        jsonb_build_object('question', 'When will I be charged?', 'answer', 'Stripe charges the selected monthly plan when the 7-day trial ends unless you cancel first.'),
        jsonb_build_object('question', 'Which plans include a trial?', 'answer', 'Eligible new customers receive a trial on Player Monthly or Streamer Monthly. Longer billing periods do not include a trial.'),
        jsonb_build_object('question', 'Can I cancel during the trial?', 'answer', 'Yes. Open the Stripe billing portal and cancel before the trial ends to avoid the first recurring charge.'),
        jsonb_build_object('question', 'Can I use the trial more than once?', 'answer', 'No. Trial eligibility is limited to accounts without a previous trial or subscription for the selected product.')
      )
    ),
    updated_at = NOW()
WHERE id = 'premium_main';