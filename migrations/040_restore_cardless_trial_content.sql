-- Keep stored premium content aligned with the account-bound cardless trial.

UPDATE public.subscription_page_content
SET content = content || jsonb_build_object(
      'hero_description', 'Start with 7 days free without a card. Choose a paid plan only when you are ready.',
      'trial_heading', '7-day free trial',
      'trial_description', 'Eligible new users can try Streamers Center free for 7 days without adding payment information.',
      'trial_supporting', 'The trial does not renew automatically. Stripe checkout opens only when you choose a paid plan.',
      'trust_labels', jsonb_build_array('No card required', 'No automatic renewal', 'Stripe for paid plans'),
      'primary_cta', 'Start 7-day free trial',
      'legal_note', 'The free trial requires no payment method and does not convert automatically. Paid plans are purchased separately through Stripe Checkout.',
      'faq', jsonb_build_array(
        jsonb_build_object('question', 'Does the trial require a card?', 'answer', 'No. You can start the 7-day trial without adding payment information.'),
        jsonb_build_object('question', 'Will I be charged when the trial ends?', 'answer', 'No. The trial ends automatically and does not convert to a paid subscription.'),
        jsonb_build_object('question', 'How do I choose a paid plan?', 'answer', 'Select a plan separately when you are ready. Paid subscriptions are handled securely through Stripe Checkout.'),
        jsonb_build_object('question', 'Can I use the trial more than once?', 'answer', 'No. The free trial is limited to one per account.'),
        jsonb_build_object('question', 'Which access should I trial?', 'answer', 'Choose Player for personal Bonus Hunt tools or Streamer for overlays and creator tools.')
      )
    ),
    updated_at = NOW()
WHERE id = 'premium_main';