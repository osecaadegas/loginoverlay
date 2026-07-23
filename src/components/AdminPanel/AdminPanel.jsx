import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAdmin } from '../../hooks/useAdmin';
import { getAllUsers, revokeUserAccess, deleteUser, MODERATOR_PERMISSIONS, addUserRole, removeUserRole } from '../../utils/adminUtils';
import { supabase } from '../../config/supabaseClient';
import './AdminPanel.css';
import './AdminPanel.new.css';
import ApiKeysAdmin from './ApiKeysAdmin';
import { CasinoOfferModal } from './modals';
import {
  SidePanel,
  StatsCard,
  StatsGrid,
  ConfirmButton,
} from './components';

// Valid tab IDs for URL deep linking
const DEFAULT_ADMIN_TAB = 'users';
const VALID_TABS = new Set(['users', 'offers', 'apikeys']);
const getValidAdminTab = (tab) => (VALID_TABS.has(tab) ? tab : DEFAULT_ADMIN_TAB);
const SLOT_CATALOG_SELECT = 'id, name, provider, image, rtp, volatility, max_win_multiplier, status, is_featured, sort_order';
const CASINO_OFFER_ALLOWED_COLS = [
  'casino_name','bonus_link','title','image_url','list_image_url',
  'badge','badge_class','min_deposit','max_withdrawal','withdrawal_time',
  'cashback','bonus_value','free_spins','game_providers','total_games',
  'license','welcome_bonus','languages','established','live_support',
  'details','deposit_methods','video_url','promo_code',
  'crypto_friendly','vpn_friendly','is_premium','is_active','display_order',
  'highlights',
  'landing_tag','landing_tag_color','landing_model','landing_badges',
  'landing_accent_color','landing_logo_bg',
  'slug','partner_logo_url','cover_image_url','partnership_category',
  'short_description','is_verified','is_featured','is_exclusive','is_new',
  'is_hot','has_direct_manager','streamer_balance_available',
  'application_status','applications_close_at','application_url','terms_url',
  'visibility','deal_model','cpa_amount','cpa_currency','revenue_share_percent',
  'fixed_fee_amount','fixed_fee_currency','hybrid_terms','min_ftd_requirement',
  'minimum_deposit','minimum_deposit_currency','cookie_duration_days',
  'payment_frequency','payment_methods','player_promotion','traffic_requirements',
  'restrictions','supported_geos','supported_platforms','public_notes',
  'private_notes','last_updated_at','archived_at'
];
const CASINO_OFFER_LIST_KEYS = ['supported_geos', 'supported_platforms', 'payment_methods'];

function getSessionStatusLabel(status) {
  if (status === 'active') return '🟢 Active';
  if (status === 'completed') return '✅ Completed';
  return '🚫 Cancelled';
}

function getTransferPasswordButtonLabel(isLoading, activePassword) {
  if (isLoading) return '⏳...';
  if (activePassword) return '🔄 Regenerate';
  return '🔐 Generate';
}

function getOfferClickRowBackground(isExpanded, index) {
  if (isExpanded) return 'rgba(99,102,241,0.06)';
  return index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)';
}

function Show({ when, children }) {
  return when ? children : null;
}

function parseCasinoOfferList(value) {
  if (typeof value !== 'string') return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value.split(/[\n,;]+/).map(item => item.trim()).filter(Boolean);
  }
}

function buildCasinoOfferPayload(formData) {
  const payload = {};
  for (const key of CASINO_OFFER_ALLOWED_COLS) {
    if (key in formData) payload[key] = formData[key];
  }
  if (typeof payload.game_providers === 'string') {
    try { payload.game_providers = JSON.parse(payload.game_providers); } catch { payload.game_providers = []; }
  }
  for (const key of CASINO_OFFER_LIST_KEYS) {
    payload[key] = parseCasinoOfferList(payload[key]);
  }
  return payload;
}

function getGuessSessionTotals(formData, slots) {
  const startVal = Number.parseFloat(formData.start_value) || 0;
  const finalBal = formData.final_balance ? Number.parseFloat(formData.final_balance) : null;
  const totalBets = slots.reduce((sum, slot) => sum + (Number.parseFloat(slot.bet_value) || 0), 0);
  const beMultiplier = startVal > 0 && totalBets > 0 && finalBal ? (finalBal / startVal) / totalBets : 1.0;
  return { startVal, finalBal, totalBets, beMultiplier };
}

async function fetchSlotCatalog() {
  let allSlots = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('slots')
      .select(SLOT_CATALOG_SELECT)
      .order('name', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;
    allSlots = [...allSlots, ...(data || [])];
    page++;
    hasMore = (data || []).length === pageSize;
  }

  return allSlots;
}

async function fetchGuessBalanceSessions() {
  const { data, error } = await supabase
    .from('guess_balance_sessions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function fetchGuessBalanceSlots(sessionId) {
  const { data, error } = await supabase
    .from('guess_balance_slots')
    .select('*')
    .eq('session_id', sessionId)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

function createUsernameMap(connections) {
  const usernameMap = {};
  (connections || []).forEach(conn => {
    usernameMap[conn.user_id] = conn.se_username;
  });
  return usernameMap;
}

async function fetchUsernamesForRows(rows) {
  const userIds = [...new Set((rows || []).map(row => row.user_id))];
  const { data } = await supabase
    .from('streamelements_connections')
    .select('user_id, se_username')
    .in('user_id', userIds);
  return createUsernameMap(data);
}

async function fetchSessionGuesses(sessionId) {
  const { data, error } = await supabase
    .from('guess_balance_guesses')
    .select('*')
    .eq('session_id', sessionId)
    .order('guessed_at', { ascending: true });

  if (error) throw error;
  const usernameMap = await fetchUsernamesForRows(data);
  return (data || []).map(guess => ({
    ...guess,
    display_name: usernameMap[guess.user_id] || guess.user_id?.slice(0, 8)
  }));
}

async function fetchSessionVotes(sessionId) {
  const { data: votesData, error: votesError } = await supabase
    .from('guess_balance_slot_votes')
    .select('*')
    .eq('session_id', sessionId)
    .order('voted_at', { ascending: true });

  if (votesError) throw votesError;
  const { data: slotsData } = await supabase
    .from('guess_balance_slots')
    .select('id, slot_name')
    .eq('session_id', sessionId);
  const usernameMap = await fetchUsernamesForRows(votesData);
  const slotsMap = Object.fromEntries((slotsData || []).map(slot => [slot.id, slot.slot_name]));

  return (votesData || []).map(vote => ({
    ...vote,
    slot_name: slotsMap[vote.slot_id] || 'Unknown Slot',
    display_name: usernameMap[vote.user_id] || vote.user_id?.slice(0, 8)
  }));
}

export default function AdminPanel() { // NOSONAR - legacy admin screen split should be handled as a dedicated refactor
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [roleFilter, setRoleFilter] = useState(null);
  const [offerSearch, setOfferSearch] = useState('');
  const [offerClicks, setOfferClicks] = useState([]);
  const [clicksLoading, setClicksLoading] = useState(false);
  const [offerSubTab, setOfferSubTab] = useState('cards'); // 'cards' | 'analytics'
  const [expandedClickId, setExpandedClickId] = useState(null);
  const [clickFilter, setClickFilter] = useState('');
  const [clickDateFilter, setClickDateFilter] = useState('all'); // 'all' | 'today' | '7d' | '30d'

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  // Get initial tab from URL or default to 'users'
  const getInitialTab = () => {
    const tabFromUrl = searchParams.get('tab');
    return getValidAdminTab(tabFromUrl);
  };

  // Offer Card Builder State
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [offers, setOffers] = useState([]);
  const [editingOffer, setEditingOffer] = useState(null);
  const [showOfferModal, setShowOfferModal] = useState(false);

  // Daily Wheel State
  const [wheelPrizes, setWheelPrizes] = useState([]);
  const [showWheelModal, setShowWheelModal] = useState(false);
  const [editingPrize, setEditingPrize] = useState(null);
  const [prizeFormData, setPrizeFormData] = useState({
    label: '',
    icon: '🎁',
    color: '#1a1a1a',
    text_color: '#ffffff',
    se_points: 0,
    probability: 1,
    is_active: true,
    display_order: 0
  });

  // Guess Balance State
  const [guessBalanceSessions, setGuessBalanceSessions] = useState([]);
  const [guessBalanceSlots, setGuessBalanceSlots] = useState([]);
  const [showGuessBalanceModal, setShowGuessBalanceModal] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [showSlotResultsModal, setShowSlotResultsModal] = useState(false);
  const [showGuessesModal, setShowGuessesModal] = useState(false);
  const [showVotesModal, setShowVotesModal] = useState(false);
  const [sessionGuesses, setSessionGuesses] = useState([]);
  const [sessionVotes, setSessionVotes] = useState([]);
  const [currentSlotIndex, setCurrentSlotIndex] = useState(0);
  const [editingGuessSession, setEditingGuessSession] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null);
  const [selectedSessionForSlots, setSelectedSessionForSlots] = useState(null);
  // Slot catalog for adding to sessions
  const [slotCatalog, setSlotCatalog] = useState([]);
  const [slotSearchQuery, setSlotSearchQuery] = useState('');
  const [sessionSlotsInModal, setSessionSlotsInModal] = useState([]);
  const [newSlotBetValue, setNewSlotBetValue] = useState(1.00);
  const [newSlotIsSuper, setNewSlotIsSuper] = useState(false);
  const [guessSessionFormData, setGuessSessionFormData] = useState({
    title: '',
    description: '',
    start_value: 0,
    amount_expended: 0,
    be_multiplier: 1.0,
    final_balance: '',
    casino_brand: '',
    casino_image_url: '',
    is_guessing_open: true,
    reveal_answer: false,
    status: 'active'
  });
  const [slotFormData, setSlotFormData] = useState({
    slot_name: '',
    slot_image_url: '',
    provider: '',
    bet_value: 0,
    is_super: false,
    bonus_win: '',
    multiplier: '',
    display_order: 0
  });

  // GTB Transfer Password State
  const [transferPassword, setTransferPassword] = useState('');
  const [transferPasswordLoading, setTransferPasswordLoading] = useState(false);
  const [activeTransferPassword, setActiveTransferPassword] = useState(null);
  const [showTransferPassword, setShowTransferPassword] = useState(false);

  // Handle tab change with URL deep linking
  const handleTabChange = (tabId) => {
    const nextTab = getValidAdminTab(tabId);
    setActiveTab(nextTab);
    setSearchParams({ tab: nextTab });
  };

  // Sync tab with URL on browser back/forward
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    const nextTab = getValidAdminTab(tabFromUrl);

    if (tabFromUrl && tabFromUrl !== nextTab) {
      setSearchParams({ tab: nextTab }, { replace: true });
      return;
    }

    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, searchParams, setSearchParams]);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  // On-demand data loading: only load data when a tab is first visited
  const loadedTabsRef = useRef(new Set());
  useEffect(() => {
    if (loadedTabsRef.current.has(activeTab)) return;
    loadedTabsRef.current.add(activeTab);
    switch (activeTab) {
      case 'users':
        loadUsers();
        break;
      case 'offers':
        loadOffers();
        break;
      case 'wheel':
        loadWheelPrizes();
        break;
      case 'guessbalance':
        loadGuessBalanceSessions();
        loadActiveTransferPassword();
        break;
      default:
        break;
    }
  }, [activeTab]);

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await getAllUsers();

    if (error) {
      setError('Failed to load users: ' + error.message);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const handleRevokeAccess = async (userId) => {
    setError('');
    setSuccess('');

    const { error } = await revokeUserAccess(userId);

    if (error) {
      setError('Failed to revoke access: ' + error.message);
    } else {
      setSuccess('User access revoked successfully!');
      loadUsers();
    }
  };

  const handleDeleteUser = async (userId) => {
    setError('');
    setSuccess('');

    const { error } = await deleteUser(userId);

    if (error) {
      setError('Failed to delete user: ' + error.message);
    } else {
      setSuccess('User deleted successfully!');
      loadUsers();
    }
  };

  const openEditModal = (user) => {
    setEditingUser({
      ...user,
      newRole: '',
      newRoleExpiryDays: '',
      newRoleModeratorPermissions: {}
    });
  };

  const handleAddRole = async () => {
    if (!editingUser?.newRole) return;

    setError('');
    setSuccess('');

    let expiresAt = null;
    if (editingUser.newRoleExpiryDays && editingUser.newRoleExpiryDays > 0) {
      const date = new Date();
      date.setDate(date.getDate() + Number.parseInt(editingUser.newRoleExpiryDays, 10));
      expiresAt = date.toISOString();
    }

    const moderatorPerms = editingUser.newRole === 'moderator' ? editingUser.newRoleModeratorPermissions : null;

    const { error } = await addUserRole(editingUser.id, editingUser.newRole, expiresAt, moderatorPerms);

    if (error) {
      setError('Failed to add role: ' + error.message);
    } else {
      setSuccess('Role added successfully!');
      loadUsers();
      setEditingUser({
        ...editingUser,
        newRole: '',
        newRoleExpiryDays: '',
        newRoleModeratorPermissions: {}
      });
    }
  };

  const handleRemoveRole = async (roleToRemove) => {
    if (!editingUser) return;

    setError('');
    setSuccess('');

    const { error } = await removeUserRole(editingUser.id, roleToRemove);

    if (error) {
      setError('Failed to remove role: ' + error.message);
    } else {
      setSuccess('Role removed successfully!');
      loadUsers();
    }
  };

  const toggleModeratorPermission = (permission) => {
    if (!editingUser) return;

    setEditingUser({
      ...editingUser,
      newRoleModeratorPermissions: {
        ...editingUser.newRoleModeratorPermissions,
        [permission]: !editingUser.newRoleModeratorPermissions[permission]
      }
    });
  };

  // ===== OFFER CARD MANAGEMENT FUNCTIONS =====

  const loadOffers = async () => {
    const { data, error } = await supabase
      .from('casino_offers')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error loading offers:', error);
    } else {
      setOffers(data || []);
    }
  };

  const loadOfferClicks = async () => {
    setClicksLoading(true);
    try {
      const { data, error } = await supabase
        .from('offer_clicks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (!error) setOfferClicks(data || []);
    } catch (err) {
      console.error('Error loading offer clicks:', err);
    } finally {
      setClicksLoading(false);
    }
  };

  const openOfferModal = (offer = null) => {
    if (offer) {
      setEditingOffer(offer);
    } else {
      setEditingOffer(null);
    }
    setShowOfferModal(true);
  };

  const closeOfferModal = () => {
    setShowOfferModal(false);
    setEditingOffer(null);
  };

  const deleteOffer = async (offerId) => {
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('casino_offers')
        .delete()
        .eq('id', offerId);

      if (error) throw error;
      setSuccess('Offer deleted successfully!');
      loadOffers();
    } catch (err) {
      setError('Failed to delete offer: ' + err.message);
    }
  };

  const toggleOfferActive = async (offerId, currentStatus) => {
    setError('');
    setSuccess('');
    const nextStatus = !currentStatus;

    setOffers(prev => prev.map(offer => (
      offer.id === offerId ? { ...offer, is_active: nextStatus } : offer
    )));

    try {
      const { error } = await supabase
        .from('casino_offers')
        .update({ is_active: nextStatus })
        .eq('id', offerId);

      if (error) throw error;
      setSuccess(`Offer ${nextStatus ? 'activated' : 'deactivated'} successfully!`);
    } catch (err) {
      setOffers(prev => prev.map(offer => (
        offer.id === offerId ? { ...offer, is_active: currentStatus } : offer
      )));
      setError('Failed to update offer status: ' + err.message);
    }
  };

  // === DAILY WHEEL MANAGEMENT ===

  const loadWheelPrizes = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_wheel_prizes')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setWheelPrizes(data || []);
    } catch (err) {
      console.error('Error loading wheel prizes:', err);
    }
  };

  const openPrizeModal = (prize = null) => {
    if (prize) {
      setEditingPrize(prize);
      setPrizeFormData({
        label: prize.label,
        icon: prize.icon,
        color: prize.color,
        text_color: prize.text_color,
        se_points: prize.se_points,
        probability: prize.probability,
        is_active: prize.is_active,
        display_order: prize.display_order
      });
    } else {
      setEditingPrize(null);
      setPrizeFormData({
        label: '',
        icon: '🎁',
        color: '#1a1a1a',
        text_color: '#ffffff',
        se_points: 0,
        probability: 1,
        is_active: true,
        display_order: wheelPrizes.length
      });
    }
    setShowWheelModal(true);
  };

  const savePrize = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const prizeData = {
        ...prizeFormData,
        se_points: Number.parseInt(prizeFormData.se_points, 10) || 0,
        probability: Number.parseInt(prizeFormData.probability, 10) || 1,
        display_order: Number.parseInt(prizeFormData.display_order, 10) || 0
      };

      let result;
      if (editingPrize) {
        result = await supabase
          .from('daily_wheel_prizes')
          .update(prizeData)
          .eq('id', editingPrize.id);
      } else {
        result = await supabase
          .from('daily_wheel_prizes')
          .insert([prizeData]);
      }

      if (result.error) throw result.error;

      setSuccess(`Prize ${editingPrize ? 'updated' : 'created'} successfully!`);
      setShowWheelModal(false);
      loadWheelPrizes();
    } catch (err) {
      setError('Failed to save prize: ' + err.message);
    }
  };

  const deletePrize = async (prizeId) => {
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('daily_wheel_prizes')
        .delete()
        .eq('id', prizeId);

      if (error) throw error;
      setSuccess('Prize deleted successfully!');
      loadWheelPrizes();
    } catch (err) {
      setError('Failed to delete prize: ' + err.message);
    }
  };

  const togglePrizeActive = async (prizeId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('daily_wheel_prizes')
        .update({ is_active: !currentStatus })
        .eq('id', prizeId);

      if (error) throw error;
      setSuccess('Prize status updated!');
      loadWheelPrizes();
    } catch (err) {
      setError('Failed to update prize: ' + err.message);
    }
  };

  // === GUESS BALANCE MANAGEMENT ===

  const loadSlotCatalog = async () => {
    try {
      const allSlots = await fetchSlotCatalog();
      console.log(`Loaded ${allSlots.length} slots from catalog`);
      setSlotCatalog(allSlots);
    } catch (err) {
      console.error('Error loading slot catalog:', err);
    }
  };

  const loadGuessBalanceSessions = async () => {
    try {
      setGuessBalanceSessions(await fetchGuessBalanceSessions());
    } catch (err) {
      console.error('Error loading guess balance sessions:', err);
    }
  };

  const loadGuessBalanceSlots = async (sessionId) => {
    try {
      setGuessBalanceSlots(await fetchGuessBalanceSlots(sessionId));
    } catch (err) {
      console.error('Error loading slots:', err);
    }
  };

  // Load guesses for a session
  const loadSessionGuesses = async (sessionId) => {
    try {
      setSessionGuesses(await fetchSessionGuesses(sessionId));
    } catch (err) {
      console.error('Error loading guesses:', err);
    }
  };

  // Load votes for a session
  const loadSessionVotes = async (sessionId) => {
    try {
      setSessionVotes(await fetchSessionVotes(sessionId));
    } catch (err) {
      console.error('Error loading votes:', err);
    }
  };

  // Open guesses modal
  const openGuessesModal = async (session) => {
    setSelectedSessionForSlots(session);
    await loadSessionGuesses(session.id);
    setShowGuessesModal(true);
  };

  // Open votes modal
  const openVotesModal = async (session) => {
    setSelectedSessionForSlots(session);
    await loadSessionVotes(session.id);
    setShowVotesModal(true);
  };

  const openGuessSessionModal = async (session = null) => {
    // Load slot catalog when opening modal
    await loadSlotCatalog();
    setSlotSearchQuery('');
    setNewSlotBetValue(1.00);
    setNewSlotIsSuper(false);

    if (session) {
      setEditingGuessSession(session);
      setGuessSessionFormData({
        title: session.title,
        description: session.description || '',
        start_value: session.start_value || 0,
        amount_expended: session.amount_expended || 0,
        be_multiplier: session.be_multiplier || 1.0,
        final_balance: session.final_balance || '',
        casino_brand: session.casino_brand || '',
        casino_image_url: session.casino_image_url || '',
        is_guessing_open: session.is_guessing_open,
        reveal_answer: session.reveal_answer,
        status: session.status || 'active'
      });
      // Load existing slots for this session
      const { data: existingSlots } = await supabase
        .from('guess_balance_slots')
        .select('*')
        .eq('session_id', session.id)
        .order('display_order', { ascending: true });
      setSessionSlotsInModal(existingSlots || []);
    } else {
      setEditingGuessSession(null);
      setGuessSessionFormData({
        title: '',
        description: '',
        start_value: 0,
        amount_expended: 0,
        be_multiplier: 1.0,
        final_balance: '',
        casino_brand: '',
        casino_image_url: '',
        is_guessing_open: true,
        reveal_answer: false,
        status: 'active'
      });
      setSessionSlotsInModal([]);
    }
    setShowGuessBalanceModal(true);
  };

  // Add slot from catalog to session
  const addSlotToSession = (catalogSlot) => {
    const newSlot = {
      tempId: Date.now(), // Temporary ID for tracking before save
      slot_name: catalogSlot.name,
      slot_image_url: catalogSlot.image,
      provider: catalogSlot.provider,
      bet_value: newSlotBetValue,
      is_super: newSlotIsSuper,
      bonus_win: null,
      multiplier: null,
      display_order: sessionSlotsInModal.length
    };
    setSessionSlotsInModal([...sessionSlotsInModal, newSlot]);
    setSlotSearchQuery('');
    setNewSlotBetValue(1.00);
    setNewSlotIsSuper(false);
  };

  // Remove slot from session (in modal)
  const removeSlotFromSession = (index) => {
    const updatedSlots = sessionSlotsInModal.filter((_, i) => i !== index);
    setSessionSlotsInModal(updatedSlots);
  };

  // Filter slot catalog based on search
  const filteredSlotCatalog = slotCatalog.filter(slot => {
    const searchLower = slotSearchQuery.toLowerCase();
    const nameMatch = (slot.name || '').toLowerCase().includes(searchLower);
    const providerMatch = (slot.provider || '').toLowerCase().includes(searchLower);
    return nameMatch || providerMatch;
  });

  const saveGuessSession = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!guessSessionFormData.title) {
      setError('Title is required');
      return;
    }

    try {
      // Calculate auto values
      const { startVal, finalBal, totalBets, beMultiplier } = getGuessSessionTotals(guessSessionFormData, sessionSlotsInModal);

      const sessionData = {
        title: guessSessionFormData.title,
        description: guessSessionFormData.description,
        start_value: startVal,
        amount_expended: totalBets,
        be_multiplier: beMultiplier,
        final_balance: finalBal,
        casino_brand: guessSessionFormData.casino_brand,
        casino_image_url: guessSessionFormData.casino_image_url,
        is_guessing_open: guessSessionFormData.is_guessing_open,
        reveal_answer: guessSessionFormData.reveal_answer,
        status: guessSessionFormData.status
      };

      let sessionId;

      if (editingGuessSession) {
        const result = await supabase
          .from('guess_balance_sessions')
          .update(sessionData)
          .eq('id', editingGuessSession.id);
        if (result.error) throw result.error;
        sessionId = editingGuessSession.id;

        // Delete existing slots and re-insert (simpler than tracking changes)
        await supabase
          .from('guess_balance_slots')
          .delete()
          .eq('session_id', sessionId);
      } else {
        const user = (await supabase.auth.getUser()).data.user;
        const result = await supabase
          .from('guess_balance_sessions')
          .insert([{ ...sessionData, user_id: user.id }])
          .select()
          .single();
        if (result.error) throw result.error;
        sessionId = result.data.id;
      }

      // Save all slots for this session
      if (sessionSlotsInModal.length > 0) {
        const slotsToInsert = sessionSlotsInModal.map((slot, index) => ({
          session_id: sessionId,
          slot_name: slot.slot_name,
          slot_image_url: slot.slot_image_url,
          provider: slot.provider,
          bet_value: Number.parseFloat(slot.bet_value) || 0,
          is_super: slot.is_super || false,
          bonus_win: slot.bonus_win ? Number.parseFloat(slot.bonus_win) : null,
          multiplier: slot.multiplier ? Number.parseFloat(slot.multiplier) : null,
          display_order: index
        }));

        const { error: slotsError } = await supabase
          .from('guess_balance_slots')
          .insert(slotsToInsert);

        if (slotsError) throw slotsError;
      }

      setSuccess(`Session ${editingGuessSession ? 'updated' : 'created'} successfully with ${sessionSlotsInModal.length} slots!`);
      setShowGuessBalanceModal(false);
      loadGuessBalanceSessions();

      // Refresh slots view if this session is selected
      if (selectedSessionForSlots?.id === sessionId) {
        loadGuessBalanceSlots(sessionId);
      }
    } catch (err) {
      setError('Failed to save session: ' + err.message);
    }
  };

  const deleteGuessSession = async (sessionId) => {
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('guess_balance_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      setSuccess('Session deleted successfully!');
      loadGuessBalanceSessions();
      if (selectedSessionForSlots?.id === sessionId) {
        setSelectedSessionForSlots(null);
        setGuessBalanceSlots([]);
      }
    } catch (err) {
      setError('Failed to delete session: ' + err.message);
    }
  };

  const selectSessionForSlots = (session) => {
    setSelectedSessionForSlots(session);
    loadGuessBalanceSlots(session.id);
  };

  const openSlotModal = (slot = null) => {
    if (slot) {
      setEditingSlot(slot);
      setSlotFormData({
        slot_name: slot.slot_name,
        slot_image_url: slot.slot_image_url || '',
        provider: slot.provider || '',
        bet_value: slot.bet_value || 0,
        is_super: slot.is_super || false,
        bonus_win: slot.bonus_win || '',
        multiplier: slot.multiplier || '',
        display_order: slot.display_order || 0
      });
    } else {
      setEditingSlot(null);
      setSlotFormData({
        slot_name: '',
        slot_image_url: '',
        provider: '',
        bet_value: 0,
        is_super: false,
        bonus_win: '',
        multiplier: '',
        display_order: guessBalanceSlots.length
      });
    }
    setShowSlotModal(true);
  };

  const saveSlot = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!slotFormData.slot_name) {
      setError('Slot name is required');
      return;
    }

    if (!selectedSessionForSlots) {
      setError('Please select a session first');
      return;
    }

    try {
      const slotData = {
        session_id: selectedSessionForSlots.id,
        slot_name: slotFormData.slot_name,
        slot_image_url: slotFormData.slot_image_url,
        provider: slotFormData.provider,
        bet_value: Number.parseFloat(slotFormData.bet_value) || 0,
        is_super: slotFormData.is_super,
        bonus_win: slotFormData.bonus_win ? Number.parseFloat(slotFormData.bonus_win) : null,
        multiplier: slotFormData.multiplier ? Number.parseFloat(slotFormData.multiplier) : null,
        display_order: Number.parseInt(slotFormData.display_order, 10) || 0
      };

      let result;
      if (editingSlot) {
        result = await supabase
          .from('guess_balance_slots')
          .update(slotData)
          .eq('id', editingSlot.id);
      } else {
        result = await supabase
          .from('guess_balance_slots')
          .insert([slotData]);
      }

      if (result.error) throw result.error;

      setSuccess(`Slot ${editingSlot ? 'updated' : 'added'} successfully!`);
      setShowSlotModal(false);
      loadGuessBalanceSlots(selectedSessionForSlots.id);

      // Update amount expended on session
      const totalBets = [...guessBalanceSlots, ...(editingSlot ? [] : [slotData])]
        .reduce((sum, s) => sum + (Number.parseFloat(s.bet_value) || 0), 0);
      await supabase
        .from('guess_balance_sessions')
        .update({ amount_expended: totalBets })
        .eq('id', selectedSessionForSlots.id);
      loadGuessBalanceSessions();
    } catch (err) {
      setError('Failed to save slot: ' + err.message);
    }
  };

  const deleteSlot = async (slotId) => {
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('guess_balance_slots')
        .delete()
        .eq('id', slotId);

      if (error) throw error;
      setSuccess('Slot deleted successfully!');
      loadGuessBalanceSlots(selectedSessionForSlots.id);
    } catch (err) {
      setError('Failed to delete slot: ' + err.message);
    }
  };

  const endGuessSessionAndCalculateWinner = async (sessionId) => {
    setError('');
    setSuccess('');

    const session = guessBalanceSessions.find(s => s.id === sessionId);
    if (!session?.final_balance) {
      setError('Please set the final balance before ending the session');
      return;
    }

    try {
      const { error } = await supabase.rpc('calculate_guess_balance_winner', {
        session_uuid: sessionId
      });

      if (error) throw error;

      setSuccess('Session ended and winner calculated!');
      loadGuessBalanceSessions();
    } catch (err) {
      setError('Failed to end session: ' + err.message);
    }
  };

  // Open slot results entry modal
  const openSlotResultsModal = (session) => {
    setSelectedSessionForSlots(session);
    loadGuessBalanceSlots(session.id);
    setCurrentSlotIndex(0);
    setShowSlotResultsModal(true);
  };

  // Save current slot result and move to next
  const saveSlotResult = async (slot, autoAdvance = true) => {
    if (!slot?.id) return;

    try {
      const { error } = await supabase
        .from('guess_balance_slots')
        .update({
          bonus_win: slot.bonus_win ? Number.parseFloat(slot.bonus_win) : null,
          multiplier: slot.multiplier ? Number.parseFloat(slot.multiplier) : null
        })
        .eq('id', slot.id);

      if (error) throw error;

      showNotification('Slot result saved!', 'success');

      // Move to next slot if autoAdvance and there are more slots
      if (autoAdvance && guessBalanceSlots && guessBalanceSlots.length > 0) {
        if (currentSlotIndex < guessBalanceSlots.length - 1) {
          setCurrentSlotIndex(currentSlotIndex + 1);
        }
      }
    } catch (err) {
      showNotification('Failed to save: ' + err.message, 'error');
    }
  };

  // Navigate between slots in results modal
  const goToSlot = (index) => {
    if (guessBalanceSlots && guessBalanceSlots.length > 0) {
      if (index >= 0 && index < guessBalanceSlots.length) {
        setCurrentSlotIndex(index);
      }
    }
  };

  // === GTB TRANSFER PASSWORD MANAGEMENT ===

  // SHA-256 hash helper
  const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Generate a random 8-character alphanumeric password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    const randomValues = new Uint32Array(8);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(randomValues[i] % chars.length);
    }
    return result;
  };

  // Load active transfer password info
  const loadActiveTransferPassword = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;
      const { data, error } = await supabase
        .from('gtb_transfer_passwords')
        .select('id, created_at, expires_at, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setActiveTransferPassword(data || null);
    } catch (err) {
      console.error('Error loading transfer password:', err);
    }
  };

  // Generate a new transfer password
  const generateTransferPassword = async () => {
    setTransferPasswordLoading(true);
    setError('');
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      // Remove all existing passwords for this user (clean slate)
      await supabase
        .from('gtb_transfer_passwords')
        .delete()
        .eq('user_id', user.id);

      // Generate and hash new password
      const plainPassword = generateRandomPassword();
      const hash = await hashPassword(plainPassword);

      // Store hashed password
      const { error: insertError } = await supabase
        .from('gtb_transfer_passwords')
        .insert({
          user_id: user.id,
          password_hash: hash,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });

      if (insertError) throw insertError;

      setTransferPassword(plainPassword);
      setShowTransferPassword(true);
      setSuccess('Transfer password generated! It expires in 24 hours. Copy it now — you won\'t see it again.');
      loadActiveTransferPassword();
    } catch (err) {
      setError('Failed to generate password: ' + err.message);
    } finally {
      setTransferPasswordLoading(false);
    }
  };

  // Revoke active transfer password
  const revokeTransferPassword = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;
      await supabase
        .from('gtb_transfer_passwords')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true);

      setActiveTransferPassword(null);
      setTransferPassword('');
      setShowTransferPassword(false);
      setSuccess('Transfer password revoked.');
    } catch (err) {
      setError('Failed to revoke password: ' + err.message);
    }
  };

  // Only show brief loading for admin permission check, not data loading
  if (adminLoading) {
    return null; // Show nothing while checking admin status
  }

  if (!isAdmin) {
    return null;
  }

  const adminTabs = [
    { id: 'users', label: 'User Management', shortLabel: 'Users', kicker: 'Accounts', description: 'Roles, access and account status' },
    { id: 'offers', label: 'Partnerships', shortLabel: 'Partnerships', kicker: 'Marketplace', description: 'Streamer deals and click analytics' },
    { id: 'apikeys', label: 'API Keys', shortLabel: 'API Keys', kicker: 'Access', description: 'External integrations and tokens' },
  ];
  const activeAdminTab = adminTabs.find(tab => tab.id === activeTab) || adminTabs[0];

  return (
    <div className="admin-panel admin-panel-modern">
      <div className="admin-header">
        <div className="admin-title-block">
          <span className="admin-kicker">Streamers Center Control</span>
          <h1>Admin Panel</h1>
          <p>{activeAdminTab.description}</p>
        </div>
        <div className="admin-header-status" aria-label="Admin context">
          <span>{activeAdminTab.kicker}</span>
          <strong>{activeAdminTab.shortLabel}</strong>
        </div>
        <h1>🛡️ Admin Panel</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Category Dropdown */}
      <div className="admin-dropdown-nav">
        <div className="admin-tab-rail" role="tablist" aria-label="Admin sections">
          {adminTabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`admin-tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <span className="admin-tab-kicker">{tab.kicker}</span>
              <span className="admin-tab-label">{tab.shortLabel}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="admin-affiliate-shortcut"
          onClick={() => navigate('/admin/affiliates')}
        >
          Affiliate Manager
        </button>
        <div className="admin-dropdown-wrapper admin-dropdown-wrapper-clean">
          <select
            className="admin-dropdown-select"
            value={activeTab}
            onChange={(e) => handleTabChange(e.target.value)}
            aria-label="Select admin section"
          >
            {adminTabs.map(tab => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
          <svg className="admin-dropdown-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </div>
        <div className="admin-dropdown-wrapper">
          <select
            className="admin-dropdown-select"
            value={activeTab}
            onChange={(e) => handleTabChange(e.target.value)}
          >
            {[
              { id: 'users',     label: 'User Management', icon: '👥' },
              { id: 'offers',    label: 'Partnerships',     icon: '🤝' },
              { id: 'apikeys',   label: 'API Keys',         icon: '🔑' },
            ].map(tab => (
              <option key={tab.id} value={tab.id}>
                {tab.icon}  {tab.label}
              </option>
            ))}
          </select>
          <svg className="admin-dropdown-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </div>
      </div>

      {/* User Management Tab */}
      <Show when={activeTab === 'users'}>
        <>
          <StatsGrid columns={7}>
            <StatsCard
              icon="👥"
              value={users.length}
              label="Total Users"
              color="primary"
            />
            <StatsCard
              icon="🛡️"
              value={users.filter(u => u.roles?.some(r => r.role === 'admin')).length}
              label="Admins"
              color="error"
            />
            <StatsCard
              icon="🎰"
              value={users.filter(u => u.roles?.some(r => r.role === 'slot_modder')).length}
              label="Slot Modders"
              color="warning"
            />
            <StatsCard
              icon="⚠️"
              value={users.filter(u => u.roles?.some(r => r.role === 'moderator')).length}
              label="Moderators"
              color="info"
            />
            <StatsCard
              icon="💎"
              value={users.filter(u => u.roles?.some(r => r.role === 'premium')).length}
              label="Premium"
              color="warning"
            />
            <StatsCard
              icon="✅"
              value={users.filter(u => u.roles?.some(r => r.role === 'affiliate')).length}
              label="Affiliates"
              color="primary"
            />
            <StatsCard
              icon="AF"
              value={users.filter(u => u.is_active).length}
              label="Active Users"
              color="success"
            />
          </StatsGrid>

          {/* User Management - Enterprise Grade */}
          <div className="users-section">
            {/* Toolbar */}
            <div className="users-toolbar">
              <div className="toolbar-left">
                <div className="search-wrapper">
                  <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="search-input"
                  />
                  {userSearch && (
                    <button className="search-clear" onClick={() => setUserSearch('')}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6 6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="filter-pills">
                  <button
                    className={`filter-pill ${!roleFilter ? 'active' : ''}`}
                    onClick={() => setRoleFilter(null)}
                  >
                    All
                  </button>
                  <button
                    className={`filter-pill ${roleFilter === 'admin' ? 'active' : ''}`}
                    onClick={() => setRoleFilter(roleFilter === 'admin' ? null : 'admin')}
                  >
                    <span className="pill-dot admin"></span>{' '}
                    Admins
                  </button>
                  <button
                    className={`filter-pill ${roleFilter === 'premium' ? 'active' : ''}`}
                    onClick={() => setRoleFilter(roleFilter === 'premium' ? null : 'premium')}
                  >
                    <span className="pill-dot premium"></span>{' '}
                    Premium
                  </button>
                  <button
                    className={`filter-pill ${roleFilter === 'slot_modder' ? 'active' : ''}`}
                    onClick={() => setRoleFilter(roleFilter === 'slot_modder' ? null : 'slot_modder')}
                  >
                    <span className="pill-dot modder"></span>{' '}
                    Modders
                  </button>
                  <button
                    className={`filter-pill ${roleFilter === 'affiliate' ? 'active' : ''}`}
                    onClick={() => setRoleFilter(roleFilter === 'affiliate' ? null : 'affiliate')}
                  >
                    <span className="pill-dot affiliate"></span>{' '}
                    Affiliates
                  </button>
                </div>
              </div>

              <div className="toolbar-right">
                <span className="results-count">
                  {(() => {
                    const filtered = users.filter(user => {
                      if (!userSearch && !roleFilter) return true;
                      const search = userSearch.toLowerCase();
                      const matchesSearch = !userSearch ||
                        user.email?.toLowerCase().includes(search) ||
                        user.provider_username?.toLowerCase().includes(search);
                      const matchesRole = !roleFilter ||
                        user.roles?.some(r => r.role === roleFilter);
                      return matchesSearch && matchesRole;
                    });
                    return `${filtered.length} user${filtered.length !== 1 ? 's' : ''}`;
                  })()}
                </span>
              </div>
            </div>

            {/* Data Table */}
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="col-user">User</th>
                    <th className="col-roles">Roles</th>
                    <th className="col-status">Status</th>
                    <th className="col-date">Joined</th>
                    <th className="col-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter(user => {
                      if (!userSearch && !roleFilter) return true;
                      const search = userSearch.toLowerCase();
                      const matchesSearch = !userSearch ||
                        user.email?.toLowerCase().includes(search) ||
                        user.provider?.toLowerCase().includes(search) ||
                        user.provider_username?.toLowerCase().includes(search);
                      const matchesRole = !roleFilter ||
                        user.roles?.some(r => r.role === roleFilter);
                      return matchesSearch && matchesRole;
                    })
                    .slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage)
                    .map(user => {
                      const significantRoles = user.roles?.filter(r => r.role !== 'user') || [];
                      return (
                        <tr
                          key={user.id}
                          className={`table-row ${selectedUserId === user.id ? 'selected' : ''} ${!user.is_active ? 'inactive' : ''}`}
                        >
                          <td className="col-user">
                            <div className="user-cell">
                              <div className={`avatar avatar-${user.provider?.toLowerCase() || 'email'}`}>
                                {user.provider === 'twitch' && (
                                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>
                                )}
                                {user.provider === 'discord' && (
                                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z"/></svg>
                                )}
                                {user.provider === 'google' && (
                                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                                )}
                                {(!user.provider || user.provider === 'email') && (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg>
                                )}
                              </div>
                              <div className="user-info">
                                <span className="user-name">{user.provider_username || user.email?.split('@')[0]}</span>
                                <span className="user-email">{user.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="col-roles">
                            <div className="roles-list">
                              {significantRoles.length > 0 ? (
                                significantRoles.map((roleObj) => (
                                  <span key={`${user.id}-${roleObj.role}`} className={`role-tag role-${roleObj.role}`}>
                                    {roleObj.role === 'admin' && '🛡️'}
                                    {roleObj.role === 'premium' && '⭐'}
                                    {roleObj.role === 'slot_modder' && '🎰'}
                                    {roleObj.role === 'moderator' && '🔧'}
                                    {roleObj.role === 'affiliate' && 'AF'}
                                    {roleObj.role.replaceAll('_', ' ')}
                                  </span>
                                ))
                              ) : (
                                <span className="role-tag role-none">—</span>
                              )}
                            </div>
                          </td>
                          <td className="col-status">
                            <span className={`status-dot ${user.is_active ? 'active' : 'inactive'}`}>
                              <span className="dot"></span>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="col-date">
                            <span className="date-text">
                              {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </span>
                          </td>
                          <td className="col-actions">
                            <button
                              className="btn-row-action"
                              onClick={() => {
                                setSelectedUserId(user.id);
                                openEditModal(user);
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                              Manage
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>

              {/* Empty State */}
              {users.filter(user => {
                if (!userSearch && !roleFilter) return true;
                const search = userSearch.toLowerCase();
                const matchesSearch = !userSearch ||
                  user.email?.toLowerCase().includes(search) ||
                  user.provider_username?.toLowerCase().includes(search);
                const matchesRole = !roleFilter ||
                  user.roles?.some(r => r.role === roleFilter);
                return matchesSearch && matchesRole;
              }).length === 0 && (
                <div className="empty-state">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <p>No users found</p>
                  <span>Try adjusting your search or filters</span>
                </div>
              )}
            </div>

            {/* Pagination */}
            {(() => {
              const filteredUsers = users.filter(user => {
                if (!userSearch && !roleFilter) return true;
                const search = userSearch.toLowerCase();
                const matchesSearch = !userSearch ||
                  user.email?.toLowerCase().includes(search) ||
                  user.provider_username?.toLowerCase().includes(search);
                const matchesRole = !roleFilter ||
                  user.roles?.some(r => r.role === roleFilter);
                return matchesSearch && matchesRole;
              });
              const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
              const startItem = (currentPage - 1) * usersPerPage + 1;
              const endItem = Math.min(currentPage * usersPerPage, filteredUsers.length);

              if (filteredUsers.length <= usersPerPage) return null;

              return (
                <div className="pagination-bar">
                  <span className="pagination-text">
                    Showing {startItem}–{endItem} of {filteredUsers.length}
                  </span>
                  <div className="pagination-controls">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="pagination-btn"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m15 18-6-6 6-6"/>
                      </svg>
                    </button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`pagination-num ${currentPage === pageNum ? 'active' : ''}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage >= totalPages}
                      className="pagination-btn"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m9 18 6-6-6-6"/>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Edit User Side Panel */}
          <SidePanel
            isOpen={!!selectedUserId && !!editingUser}
            onClose={() => {
              setSelectedUserId(null);
              setEditingUser(null);
            }}
            title="Manage User"
            width="420px"
          >
            {editingUser && (
              <div className="panel-content">
                {/* User Header */}
                <div className="panel-user-header">
                  <div className={`panel-avatar avatar-${editingUser.provider?.toLowerCase() || 'email'}`}>
                    {editingUser.provider === 'twitch' && (
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>
                    )}
                    {editingUser.provider === 'discord' && (
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z"/></svg>
                    )}
                    {(!editingUser.provider || editingUser.provider === 'email') && (
                      <span>{editingUser.email?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="panel-user-info">
                    <h3>{editingUser.provider_username || editingUser.email?.split('@')[0]}</h3>
                    <span className="panel-user-email">{editingUser.email}</span>
                    <div className="panel-user-meta">
                      <span className={`status-dot ${editingUser.is_active ? 'active' : 'inactive'}`}>
                        <span className="dot"></span>
                        {editingUser.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="meta-separator">•</span>
                      <span>Joined {editingUser.created_at ? new Date(editingUser.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown'}</span>
                    </div>
                  </div>
                </div>

                {/* Roles Section */}
                <div className="panel-section">
                  <div className="section-header">
                    <h4>Roles</h4>
                  </div>
                  <div className="roles-manager">
                    {(editingUser.roles || []).filter(r => r.role !== 'user').map((roleObj) => (
                      <div key={`${editingUser.id}-${roleObj.role}`} className={`role-chip role-${roleObj.role}`}>
                        <span className="role-chip-icon">
                          {roleObj.role === 'admin' && '🛡️'}
                          {roleObj.role === 'premium' && '⭐'}
                          {roleObj.role === 'slot_modder' && '🎰'}
                          {roleObj.role === 'moderator' && '🔧'}
                        </span>
                        {roleObj.role === 'affiliate' && 'AF'}
                        <span className="role-chip-name">{roleObj.role.replaceAll('_', ' ')}</span>
                        {roleObj.access_expires_at && (
                          <span className="role-chip-expiry">
                            {new Date(roleObj.access_expires_at).toLocaleDateString()}
                          </span>
                        )}
                        <button
                          className="role-chip-remove"
                          onClick={() => handleRemoveRole(roleObj.role)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6 6 18M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                    {(!editingUser.roles || editingUser.roles.filter(r => r.role !== 'user').length === 0) && (
                      <p className="no-roles-text">No special roles assigned</p>
                    )}
                  </div>
                </div>

                {/* Add Role Section */}
                <div className="panel-section">
                  <div className="section-header">
                    <h4>Add Role</h4>
                  </div>
                  <div className="add-role-form">
                    <select
                      value={editingUser.newRole || ''}
                      onChange={(e) => setEditingUser({...editingUser, newRole: e.target.value, newRoleModeratorPermissions: {}})}
                      className="role-select"
                    >
                      <option value="">Select a role...</option>
                      <option value="premium">⭐ Premium</option>
                      <option value="slot_modder">🎰 Slot Modder</option>
                      <option value="moderator">🔧 Moderator</option>
                      <option value="admin">🛡️ Admin</option>
                      <option value="affiliate">Affiliate</option>
                    </select>

                    {editingUser.newRole === 'moderator' && (
                      <div className="permissions-box">
                        <span className="permissions-title">Moderator Permissions</span>
                        <div className="permissions-list">
                          {Object.entries(MODERATOR_PERMISSIONS).map(([key, description]) => (
                            <label key={key} className="permission-item">
                              <input
                                type="checkbox"
                                checked={!!editingUser.newRoleModeratorPermissions?.[key]}
                                onChange={() => toggleModeratorPermission(key)}
                              />
                              <span>{key.replaceAll('_', ' ')}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {editingUser.newRole && (
                      <div className="add-role-actions">
                        <input
                          type="number"
                          placeholder="Expires in (days)"
                          value={editingUser.newRoleExpiryDays || ''}
                          onChange={(e) => setEditingUser({...editingUser, newRoleExpiryDays: e.target.value})}
                          min="1"
                          className="expiry-input"
                        />
                        <button onClick={handleAddRole} className="btn-add-role">
                          Add Role
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="panel-section danger">
                  <div className="section-header">
                    <h4>Danger Zone</h4>
                  </div>
                  <div className="danger-buttons">
                    <button
                      className="btn-danger secondary"
                      onClick={() => handleRevokeAccess(editingUser.id)}
                      disabled={!editingUser.is_active}
                    >
                      Revoke Access
                    </button>
                    <button
                      className="btn-danger primary"
                      onClick={() => {
                        if (window.confirm('Permanently delete this user? This cannot be undone.')) {
                          handleDeleteUser(editingUser.id);
                          setSelectedUserId(null);
                          setEditingUser(null);
                        }
                      }}
                    >
                      Delete User
                    </button>
                  </div>
                </div>
              </div>
            )}
          </SidePanel>
        </>
      </Show>

      {/* Streamer Partnerships Tab */}
      <Show when={activeTab === 'offers'}>
        <div className="offers-management">
          <div className="offers-header">
            <h2>Streamer Partnerships</h2>
            <div className="offers-header-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => setOfferSubTab('cards')}
                  style={{
                    padding: '6px 14px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: offerSubTab === 'cards' ? '#6366f1' : 'rgba(255,255,255,0.08)', color: offerSubTab === 'cards' ? '#fff' : '#94a3b8',
                  }}
                >📰 Marketplace</button>
                <button
                  onClick={() => { setOfferSubTab('analytics'); if (offerClicks.length === 0) loadOfferClicks(); }}
                  style={{
                    padding: '6px 14px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: offerSubTab === 'analytics' ? '#6366f1' : 'rgba(255,255,255,0.08)', color: offerSubTab === 'analytics' ? '#fff' : '#94a3b8',
                  }}
                >📊 Click Analytics</button>
              </div>
              {offerSubTab === 'cards' && (
                <>
                  <div className="offer-search-bar">
                    <input
                      type="text"
                      placeholder="Search by partner, title, category, model, or badge..."
                      value={offerSearch}
                      onChange={(e) => setOfferSearch(e.target.value)}
                    />
                  </div>
                  <button onClick={() => openOfferModal()} className="btn-create-offer">
                    ➕ Create Partnership
                  </button>
                </>
              )}
              {offerSubTab === 'analytics' && (
                <button onClick={loadOfferClicks} className="btn-create-offer" style={{ fontSize: 12 }}>
                  🔄 Refresh
                </button>
              )}
            </div>
          </div>

          {/* ── CARDS SUB-TAB ── */}
          {offerSubTab === 'cards' && (
            <>
              <div className="offers-grid">
                {offers
                  .filter(offer => {
                    if (!offerSearch.trim()) return true;
                    const search = offerSearch.toLowerCase();
                    return (
                      offer.casino_name?.toLowerCase().includes(search) ||
                      offer.title?.toLowerCase().includes(search) ||
                      offer.partnership_category?.toLowerCase().includes(search) ||
                      offer.deal_model?.toLowerCase().includes(search) ||
                      offer.badge?.toLowerCase().includes(search) ||
                      offer.bonus_value?.toLowerCase().includes(search)
                    );
                  })
                  .map((offer) => (
              <div key={offer.id} className={`offer-admin-card ${!offer.is_active ? 'inactive' : ''}`}>
                <div className="offer-admin-image">
                  <img src={offer.cover_image_url || offer.list_image_url || offer.image_url} alt={offer.casino_name} />
                  {(offer.is_featured || offer.badge) && (
                    <span className={`offer-badge ${offer.is_featured ? 'featured' : offer.badge_class}`}>
                      {offer.is_featured ? 'FEATURED' : offer.badge}
                    </span>
                  )}
                  {!offer.is_active && (
                    <div className="inactive-overlay">INACTIVE</div>
                  )}
                </div>
                <div className="offer-admin-content">
                  <h3>{offer.casino_name}</h3>
                  <p className="offer-title">{offer.title}</p>
                  <div className="offer-stats">
                    <span>{offer.partnership_category || 'casino'}</span>
                    <span>{offer.deal_model || offer.landing_model || 'Affiliate'}</span>
                    <span>{offer.visibility || (offer.is_premium ? 'premium' : 'public')}</span>
                  </div>
                  <div className="offer-stats">
                    <span>{offer.cpa_amount ? `${offer.cpa_currency || 'EUR'} ${offer.cpa_amount}` : 'CPA not set'}</span>
                    <span>{offer.revenue_share_percent ? `${offer.revenue_share_percent}% RevShare` : 'RevShare not set'}</span>
                    <span>{offer.application_status || 'open'}</span>
                  </div>
                  <div className="offer-admin-actions">
                    <button
                      onClick={() => openOfferModal(offer)}
                      className="btn-edit-offer"
                      title="Edit offer"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => toggleOfferActive(offer.id, offer.is_active)}
                      className={`btn-toggle-offer ${offer.is_active ? 'active' : ''}`}
                      title={offer.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {offer.is_active ? '👁️ Active' : '❌ Inactive'}
                    </button>
                    <ConfirmButton
                      onConfirm={() => deleteOffer(offer.id)}
                      confirmText="Delete?"
                      className="btn-delete-offer"
                      title="Delete offer"
                      variant="danger"
                    >
                      🗑️
                    </ConfirmButton>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {offers.length === 0 && (
            <div className="no-offers">
              <p>No partnerships yet. Create your first marketplace deal!</p>
            </div>
          )}
            </>
          )}

          {/* ── ANALYTICS SUB-TAB ── */}
          {offerSubTab === 'analytics' && (
            <div style={{ marginTop: 16 }}>
              {clicksLoading && (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: 40 }}>Loading click data…</p>
              )}
              {!clicksLoading && offerClicks.length === 0 && (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: 40 }}>No clicks recorded yet. Clicks will appear here once viewers start clicking offer cards.</p>
              )}
              {!clicksLoading && offerClicks.length > 0 && (
                <>
                  {/* Summary cards */}
                  {(() => {
                    const byOffer = {};
                    const byCountry = {};
                    const uniqueIps = new Set();
                    const uniqueUsers = new Set();
                    const today = new Date().toISOString().slice(0, 10);
                    let todayCount = 0;
                    for (const c of offerClicks) {
                      const name = c.casino_name || 'Unknown';
                      byOffer[name] = (byOffer[name] || 0) + 1;
                      if (c.ip_address) uniqueIps.add(c.ip_address);
                      if (c.se_username) uniqueUsers.add(c.se_username);
                      else if (c.user_id) uniqueUsers.add(c.user_id);
                      if (c.created_at?.startsWith(today)) todayCount++;
                      const geo = c.country || c.country_code || null;
                      if (geo) byCountry[geo] = (byCountry[geo] || 0) + 1;
                    }
                    const sorted = Object.entries(byOffer).sort((a, b) => b[1] - a[1]);
                    const sortedCountries = Object.entries(byCountry).sort((a, b) => b[1] - a[1]);
                    return (
                      <>
                        {/* Stats row */}
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                          {[
                            { label: 'Total Clicks', value: offerClicks.length, color: '#818cf8' },
                            { label: 'Today', value: todayCount, color: '#22c55e' },
                            { label: 'Unique IPs', value: uniqueIps.size, color: '#f59e0b' },
                            { label: 'Known Users', value: uniqueUsers.size, color: '#a78bfa' },
                          ].map(s => (
                            <div key={s.label} style={{ flex: 1, minWidth: 120, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '12px 14px' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
                              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.value.toLocaleString()}</div>
                            </div>
                          ))}
                        </div>

                        {/* Per-offer breakdown */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Clicks by Casino</div>
                          {sorted.map(([name, count]) => {
                            const pct = Math.round((count / offerClicks.length) * 100);
                            return (
                              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{ width: 130, fontSize: 12, color: '#e2e8f0', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                                <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: '#6366f1', borderRadius: 99, minWidth: pct > 0 ? 4 : 0 }} />
                                </div>
                                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, minWidth: 50, textAlign: 'right' }}>{count} ({pct}%)</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Top Countries breakdown */}
                        {sortedCountries.length > 0 && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>🌍 Clicks by Country</div>
                          {sortedCountries.slice(0, 15).map(([country, count]) => {
                            const pct = Math.round((count / offerClicks.length) * 100);
                            return (
                              <div key={country} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{ width: 130, fontSize: 12, color: '#e2e8f0', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{country}</span>
                                <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: '#22c55e', borderRadius: 99, minWidth: pct > 0 ? 4 : 0 }} />
                                </div>
                                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, minWidth: 50, textAlign: 'right' }}>{count} ({pct}%)</span>
                              </div>
                            );
                          })}
                        </div>
                        )}
                      </>
                    );
                  })()}

                  {/* Click log table — full audit detail */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Full Click History ({offerClicks.length} total)</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          placeholder="Filter by casino, user, IP..."
                          value={clickFilter}
                          onChange={(e) => setClickFilter(e.target.value)}
                          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: 11, width: 200 }}
                        />
                        {['all', 'today', '7d', '30d'].map(f => (
                          <button key={f} onClick={() => setClickDateFilter(f)} style={{
                            padding: '3px 10px', borderRadius: 6, border: 'none', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                            background: clickDateFilter === f ? '#6366f1' : 'rgba(255,255,255,0.06)', color: clickDateFilter === f ? '#fff' : '#94a3b8',
                          }}>{{ all: 'All', today: 'Today', '7d': '7 Days', '30d': '30 Days' }[f]}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, width: 28 }}></th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Casino</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Twitch</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>SE Name</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>IP Address</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Location</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Source</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Date & Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const now = new Date();
                            const filtered = offerClicks.filter(c => {
                              // Date filter
                              if (clickDateFilter !== 'all') {
                                const created = new Date(c.created_at);
                                if (clickDateFilter === 'today' && created.toDateString() !== now.toDateString()) return false;
                                if (clickDateFilter === '7d' && (now - created) > 7 * 86400000) return false;
                                if (clickDateFilter === '30d' && (now - created) > 30 * 86400000) return false;
                              }
                              // Text filter
                              if (clickFilter.trim()) {
                                const q = clickFilter.toLowerCase();
                                return (
                                  (c.casino_name || '').toLowerCase().includes(q) ||
                                  (c.twitch_username || '').toLowerCase().includes(q) ||
                                  (c.se_username || '').toLowerCase().includes(q) ||
                                  (c.ip_address || '').toLowerCase().includes(q) ||
                                  (c.country || '').toLowerCase().includes(q) ||
                                  (c.city || '').toLowerCase().includes(q) ||
                                  (c.region || '').toLowerCase().includes(q) ||
                                  (c.user_agent || '').toLowerCase().includes(q) ||
                                  (c.page_source || '').toLowerCase().includes(q)
                                );
                              }
                              return true;
                            });
                            if (filtered.length === 0) return [
                              <tr key="no-click-matches"><td colSpan={8} style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No clicks match your filters</td></tr>
                            ];
                            return filtered.slice(0, 500).map((click, idx) => {
                              const isExpanded = expandedClickId === click.id;
                              const dt = new Date(click.created_at);
                              const dateStr = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                              const timeStr = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                              const isLoggedIn = !!(click.twitch_username || click.se_username || click.user_id);
                              return (
                                <React.Fragment key={click.id}>
                                  <tr
                                    onClick={() => setExpandedClickId(isExpanded ? null : click.id)}
                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', background: getOfferClickRowBackground(isExpanded, idx) }}
                                  >
                                    <td style={{ padding: '6px 8px', color: '#64748b', fontSize: 10 }}>{isExpanded ? '▼' : '▶'}</td>
                                    <td style={{ padding: '6px 12px', color: '#e2e8f0', fontWeight: 600 }}>{click.casino_name || '—'}</td>
                                    <td style={{ padding: '6px 12px', color: click.twitch_username ? '#a78bfa' : '#4a5568' }}>
                                      {click.twitch_username || (isLoggedIn ? '—' : <span style={{ color: '#ef4444', fontSize: 10 }}>not logged in</span>)}
                                    </td>
                                    <td style={{ padding: '6px 12px', color: click.se_username ? '#818cf8' : '#4a5568' }}>
                                      {click.se_username || '—'}
                                    </td>
                                    <td style={{ padding: '6px 12px', color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 }}>
                                      {click.ip_address ? (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <span>{click.ip_address}</span>
                                          {click.ip_address.includes(':') ? (
                                            <span title="IPv6 address (won't match affiliate dashboards)" style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600, background: 'rgba(139,92,246,0.15)', color: '#c4b5fd' }}>IPv6</span>
                                          ) : (
                                            <span title="IPv4 address (matches affiliate dashboards)" style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600, background: 'rgba(34,197,94,0.15)', color: '#86efac' }}>IPv4</span>
                                          )}
                                        </span>
                                      ) : '—'}
                                    </td>
                                    <td style={{ padding: '6px 12px', color: '#e2e8f0', fontSize: 11 }}>
                                      {click.city && click.country ? `${click.city}, ${click.country}` : click.country || click.country_code || '—'}
                                    </td>
                                    <td style={{ padding: '6px 12px' }}>
                                      <span style={{
                                        padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600,
                                        background: click.page_source === 'landing' ? 'rgba(34,197,94,0.12)' : 'rgba(99,102,241,0.12)',
                                        color: click.page_source === 'landing' ? '#86efac' : '#a5b4fc',
                                      }}>{click.page_source}</span>
                                    </td>
                                    <td style={{ padding: '6px 12px' }}>
                                      <div style={{ color: '#e2e8f0', fontSize: 11 }}>{dateStr}</div>
                                      <div style={{ color: '#64748b', fontSize: 10 }}>{timeStr}</div>
                                    </td>
                                  </tr>
                                  {isExpanded && (
                                    <tr style={{ background: 'rgba(99,102,241,0.04)' }}>
                                      <td colSpan={8} style={{ padding: '10px 20px 14px 36px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px 24px', fontSize: 11 }}>
                                          <div><span style={{ color: '#64748b', fontWeight: 600 }}>Click ID: </span><span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 10 }}>{click.id}</span></div>
                                          <div><span style={{ color: '#64748b', fontWeight: 600 }}>Offer ID: </span><span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 10 }}>{click.offer_id}</span></div>
                                          <div><span style={{ color: '#64748b', fontWeight: 600 }}>User ID: </span><span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 10 }}>{click.user_id || 'Anonymous'}</span></div>
                                          <div><span style={{ color: '#64748b', fontWeight: 600 }}>Twitch: </span><span style={{ color: '#a78bfa' }}>{click.twitch_username || '—'}</span></div>
                                          <div><span style={{ color: '#64748b', fontWeight: 600 }}>SE Username: </span><span style={{ color: '#818cf8' }}>{click.se_username || '—'}</span></div>
                                          <div><span style={{ color: '#64748b', fontWeight: 600 }}>IP Address: </span><span style={{ color: '#f59e0b', fontFamily: 'monospace' }}>{click.ip_address || '—'}</span></div>
                                          <div><span style={{ color: '#64748b', fontWeight: 600 }}>Country: </span><span style={{ color: '#22c55e' }}>{click.country || '—'} {click.country_code ? `(${click.country_code})` : ''}</span></div>
                                          <div><span style={{ color: '#64748b', fontWeight: 600 }}>Region: </span><span style={{ color: '#94a3b8' }}>{click.region || '—'}</span></div>
                                          <div><span style={{ color: '#64748b', fontWeight: 600 }}>City: </span><span style={{ color: '#94a3b8' }}>{click.city || '—'}</span></div>
                                          <div><span style={{ color: '#64748b', fontWeight: 600 }}>Page: </span><span style={{ color: '#94a3b8' }}>{click.page_source}</span></div>
                                          <div><span style={{ color: '#64748b', fontWeight: 600 }}>Exact Time: </span><span style={{ color: '#94a3b8' }}>{new Date(click.created_at).toISOString()}</span></div>
                                          <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#64748b', fontWeight: 600 }}>User Agent: </span><span style={{ color: '#64748b', fontSize: 10, wordBreak: 'break-all' }}>{click.user_agent || '—'}</span></div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </Show>

      {/* Casino Offer Modal - New Isolated Component */}
      <CasinoOfferModal
        isOpen={showOfferModal}
        onClose={closeOfferModal}
        onSave={async (formData) => {
          try {
            const payload = buildCasinoOfferPayload(formData);

            if (editingOffer) {
              const { error } = await supabase
                .from('casino_offers')
                .update(payload)
                .eq('id', editingOffer.id);
              if (error) throw error;
            } else {
              const { error } = await supabase
                .from('casino_offers')
                .insert([{ ...payload, created_by: (await supabase.auth.getUser()).data.user?.id }]);
              if (error) throw error;
            }
            closeOfferModal();
            loadOffers();
            setSuccess(editingOffer ? 'Offer updated successfully!' : 'Offer created successfully!');
          } catch (err) {
            setError('Failed to save offer: ' + err.message);
          }
        }}
        onDelete={async (offerId) => {
          try {
            const { error } = await supabase
              .from('casino_offers')
              .delete()
              .eq('id', offerId);
            if (error) throw error;
            closeOfferModal();
            loadOffers();
            setSuccess('Offer deleted successfully!');
          } catch (err) {
            setError('Failed to delete offer: ' + err.message);
          }
        }}
        editingOffer={editingOffer}
        saving={loading}
      />

      {/* Daily Wheel Tab */}
      <Show when={activeTab === 'wheel'}>
        <>
          <div className="admin-section">
            <div className="section-header">
              <h2>🎡 Daily Wheel Prizes</h2>
              <button onClick={() => openPrizeModal()} className="btn-add">
                + Add Prize
              </button>
            </div>

            <div className="prizes-list">
              {wheelPrizes.map((prize) => (
                <div key={prize.id} className="prize-card">
                  <div className="prize-preview" style={{ backgroundColor: prize.color }}>
                    <div className="prize-icon" style={{ fontSize: '3rem' }}>
                      {prize.icon}
                    </div>
                    {!prize.is_active && (
                      <div className="inactive-badge">INACTIVE</div>
                    )}
                  </div>
                  <div className="prize-details">
                    <h3 style={{ color: prize.text_color }}>{prize.label}</h3>
                    <div className="prize-stats">
                      <span>💰 {prize.se_points} SE Points</span>
                      <span>🎲 Probability: {prize.probability}</span>
                      <span>📊 Order: {prize.display_order}</span>
                    </div>
                    <div className="prize-colors">
                      <span>BG: {prize.color}</span>
                      <span>Text: {prize.text_color}</span>
                    </div>
                  </div>
                  <div className="prize-actions">
                    <button
                      onClick={() => togglePrizeActive(prize.id, prize.is_active)}
                      className={`btn-toggle ${prize.is_active ? 'active' : 'inactive'}`}
                    >
                      {prize.is_active ? '✅ Active' : '❌ Inactive'}
                    </button>
                    <button onClick={() => openPrizeModal(prize)} className="btn-edit">
                      ✏️ Edit
                    </button>
                    <ConfirmButton
                      onConfirm={() => deletePrize(prize.id)}
                      confirmText="Delete?"
                      className="btn-delete"
                      variant="danger"
                    >
                      🗑️ Delete
                    </ConfirmButton>
                  </div>
                </div>
              ))}

              {wheelPrizes.length === 0 && (
                <div className="no-data-message">
                  <p>No prizes yet. Add your first wheel prize!</p>
                </div>
              )}
            </div>
          </div>

          {/* Prize Side Panel */}
          <SidePanel
            isOpen={showWheelModal}
            onClose={() => setShowWheelModal(false)}
            title={editingPrize ? 'Edit Prize' : 'Add New Prize'}
            width="480px"
          >
            <form onSubmit={savePrize} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
                <div className="form-section">
                  <div className="form-group">
                    <label htmlFor="wheel-prize-label">Label *</label>
                    <input
                      id="wheel-prize-label"
                      type="text"
                      value={prizeFormData.label}
                      onChange={(e) => setPrizeFormData({...prizeFormData, label: e.target.value})}
                      placeholder="500 Points"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="wheel-prize-icon">Icon (Emoji) *</label>
                    <input
                      id="wheel-prize-icon"
                      type="text"
                      value={prizeFormData.icon}
                      onChange={(e) => setPrizeFormData({...prizeFormData, icon: e.target.value})}
                      placeholder="💰"
                      required
                    />
                    <small>Use a single emoji character</small>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="wheel-prize-bg-color">Background Color *</label>
                      <input
                        id="wheel-prize-bg-color"
                        type="color"
                        value={prizeFormData.color}
                        onChange={(e) => setPrizeFormData({...prizeFormData, color: e.target.value})}
                      />
                      <input
                        aria-label="Background color hex"
                        type="text"
                        value={prizeFormData.color}
                        onChange={(e) => setPrizeFormData({...prizeFormData, color: e.target.value})}
                        placeholder="#1a1a1a"
                        style={{ marginTop: '5px' }}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="wheel-prize-text-color">Text Color *</label>
                      <input
                        id="wheel-prize-text-color"
                        type="color"
                        value={prizeFormData.text_color}
                        onChange={(e) => setPrizeFormData({...prizeFormData, text_color: e.target.value})}
                      />
                      <input
                        aria-label="Text color hex"
                        type="text"
                        value={prizeFormData.text_color}
                        onChange={(e) => setPrizeFormData({...prizeFormData, text_color: e.target.value})}
                        placeholder="#ffffff"
                        style={{ marginTop: '5px' }}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="wheel-prize-points">StreamElements Points</label>
                      <input
                        id="wheel-prize-points"
                        type="number"
                        value={prizeFormData.se_points}
                        onChange={(e) => setPrizeFormData({...prizeFormData, se_points: e.target.value})}
                        placeholder="0"
                        min="0"
                      />
                      <small>0 = no points awarded</small>
                    </div>

                    <div className="form-group">
                      <label htmlFor="wheel-prize-probability">Probability Weight *</label>
                      <input
                        id="wheel-prize-probability"
                        type="number"
                        value={prizeFormData.probability}
                        onChange={(e) => setPrizeFormData({...prizeFormData, probability: e.target.value})}
                        placeholder="1"
                        min="1"
                        required
                      />
                      <small>Higher = more likely</small>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="wheel-prize-display-order">Display Order</label>
                    <input
                      id="wheel-prize-display-order"
                      type="number"
                      value={prizeFormData.display_order}
                      onChange={(e) => setPrizeFormData({...prizeFormData, display_order: e.target.value})}
                      placeholder="0"
                      min="0"
                    />
                    <small>Position on the wheel (0-7 for 8 segments)</small>
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={prizeFormData.is_active}
                        onChange={(e) => setPrizeFormData({...prizeFormData, is_active: e.target.checked})}
                      />
                      <span>Active (visible on wheel)</span>
                    </label>
                  </div>

                  {/* Preview */}
                  <div className="form-group">
                    <div className="form-label">Preview</div>
                    <div className="prize-preview-box" style={{
                      backgroundColor: prizeFormData.color,
                      color: prizeFormData.text_color,
                      padding: '20px',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '3rem' }}>{prizeFormData.icon}</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: '10px' }}>
                        {prizeFormData.label || 'Prize Label'}
                      </div>
                      {prizeFormData.se_points > 0 && (
                        <div style={{ fontSize: '0.9rem', marginTop: '5px' }}>
                          +{prizeFormData.se_points} Points
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="side-panel-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '16px 0 0', marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowWheelModal(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  {editingPrize ? 'Update Prize' : 'Add Prize'}
                </button>
              </div>
            </form>
          </SidePanel>
        </>
      </Show>

      {/* Season Pass tab removed */}

      {/* Guess Balance Management Tab */}
      <Show when={activeTab === 'guessbalance'}>
        <>
          <div className="guess-balance-admin-section">
            <div className="section-header">
              <h2>💰 Guess the Balance Sessions</h2>
              <button className="btn-primary" onClick={() => openGuessSessionModal()}>
                + New Session
              </button>
            </div>

            {/* Transfer Password Section */}
            <div className="gtb-transfer-section">
              <div className="gtb-transfer-header">
                <h3>🔑 Bonus Hunt Transfer Password</h3>
                <p className="gtb-transfer-desc">
                  Generate a password to allow transferring bonuses from the Overlay Bonus Hunt tracker into a new GTB session.
                </p>
              </div>

              <div className="gtb-transfer-controls">
                {activeTransferPassword ? (
                  <div className="gtb-transfer-active">
                    <span className="gtb-transfer-status gtb-transfer-status--active">
                      ✅ Active password exists
                    </span>
                    <span className="gtb-transfer-expires">
                      Expires: {new Date(activeTransferPassword.expires_at).toLocaleString()}
                    </span>
                    <div className="gtb-transfer-actions">
                      <button
                        className="btn-primary"
                        onClick={generateTransferPassword}
                        disabled={transferPasswordLoading}
                      >
                        🔄 Regenerate
                      </button>
                      <ConfirmButton
                        onConfirm={revokeTransferPassword}
                        confirmText="Revoke?"
                        className="btn-delete"
                        variant="danger"
                      >
                        🗑️ Revoke
                      </ConfirmButton>
                    </div>
                  </div>
                ) : (
                  <div className="gtb-transfer-none">
                    <span className="gtb-transfer-status gtb-transfer-status--none">
                      No active password
                    </span>
                    <button
                      className="btn-primary"
                      onClick={generateTransferPassword}
                      disabled={transferPasswordLoading}
                    >
                      {transferPasswordLoading ? '⏳ Generating...' : '🔐 Generate Password'}
                    </button>
                  </div>
                )}

                {/* Show generated password (only visible right after generation) */}
                {transferPassword && showTransferPassword && (
                  <div className="gtb-transfer-reveal">
                    <div className="gtb-transfer-password-box">
                      <span className="gtb-transfer-password-label">Your transfer password:</span>
                      <code className="gtb-transfer-password-value">{transferPassword}</code>
                      <button
                        className="btn-copy"
                        onClick={() => {
                          navigator.clipboard.writeText(transferPassword);
                          setSuccess('Password copied to clipboard!');
                        }}
                        title="Copy to clipboard"
                      >
                        📋 Copy
                      </button>
                    </div>
                    <p className="gtb-transfer-warning">
                      ⚠️ Copy this password now! It will not be shown again. Use it in the Bonus Hunt tracker to send bonuses to GTB.
                    </p>
                    <button
                      className="btn-secondary gtb-transfer-dismiss"
                      onClick={() => { setShowTransferPassword(false); setTransferPassword(''); }}
                    >
                      I've copied it — dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sessions List */}
            <div className="sessions-list">
              {guessBalanceSessions.length === 0 ? (
                <div className="empty-state">
                  <p>No sessions yet. Create your first Guess the Balance session!</p>
                </div>
              ) : (
                <div className="sessions-grid">
                  {guessBalanceSessions.map(session => (
                    <div
                      key={session.id}
                      className={`session-card ${selectedSessionForSlots?.id === session.id ? 'selected' : ''} ${session.status}`}
                    >
                      <div className="session-card-header">
                        <h3>{session.title}</h3>
                        <span className={`status-badge ${session.status}`}>
                          {getSessionStatusLabel(session.status)}
                        </span>
                      </div>

                      {session.casino_brand && (
                        <div className="casino-info">
                          {session.casino_image_url && (
                            <img src={session.casino_image_url} alt={session.casino_brand} className="casino-logo-small" />
                          )}
                          <span>🏰 {session.casino_brand}</span>
                        </div>
                      )}

                      <div className="session-stats">
                        <div className="stat">
                          <span className="label">Start:</span>
                          <span className="value">€{Number.parseFloat(session.start_value || 0).toFixed(2)}</span>
                        </div>
                        <div className="stat">
                          <span className="label">Expended:</span>
                          <span className="value">€{Number.parseFloat(session.amount_expended || 0).toFixed(2)}</span>
                        </div>
                        <div className="stat">
                          <span className="label">BE x:</span>
                          <span className="value">{session.be_multiplier || 1.0}x</span>
                        </div>
                        {session.final_balance !== null && (
                          <div className="stat highlight">
                            <span className="label">Final:</span>
                            <span className="value">€{Number.parseFloat(session.final_balance || 0).toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      <div className="session-flags">
                        <span className={`flag ${session.is_guessing_open ? 'active' : ''}`}>
                          {session.is_guessing_open ? '✅ Guessing Open' : '🔒 Guessing Closed'}
                        </span>
                        <span className={`flag ${session.reveal_answer ? 'revealed' : ''}`}>
                          {session.reveal_answer ? '👁️ Answer Revealed' : '🔒 Hidden'}
                        </span>
                      </div>

                      <div className="session-actions">
                        <button className="btn-view-slots" onClick={() => selectSessionForSlots(session)}>
                          🎰 Select
                        </button>
                        <button className="btn-edit" onClick={(e) => { e.stopPropagation(); openGuessSessionModal(session); }}>
                          ✏️ Edit
                        </button>
                        <button
                          className="btn-results"
                          onClick={(e) => { e.stopPropagation(); openSlotResultsModal(session); }}
                        >
                          🎯 Enter Results
                        </button>
                        <button
                          className="btn-view-guesses"
                          onClick={(e) => { e.stopPropagation(); openGuessesModal(session); }}
                        >
                          💡 Guesses
                        </button>
                        <button
                          className="btn-view-votes"
                          onClick={(e) => { e.stopPropagation(); openVotesModal(session); }}
                        >
                          🗳️ Votes
                        </button>
                        {session.status === 'active' && session.final_balance && (
                          <ConfirmButton
                            onConfirm={() => endGuessSessionAndCalculateWinner(session.id)}
                            confirmText="End?"
                            className="btn-end"
                            onClick={(e) => e.stopPropagation()}
                            variant="warning"
                          >
                            🏆 End & Calculate Winner
                          </ConfirmButton>
                        )}
                        <ConfirmButton
                          onConfirm={() => deleteGuessSession(session.id)}
                          confirmText="Delete?"
                          className="btn-delete"
                          onClick={(e) => e.stopPropagation()}
                          variant="danger"
                        >
                          🗑️ Delete
                        </ConfirmButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Slots Management for Selected Session */}
            {selectedSessionForSlots && (
              <div className="slots-management-section">
                <div className="section-header">
                  <h3>🎰 Slots for: {selectedSessionForSlots.title}</h3>
                  <button className="btn-primary" onClick={() => openSlotModal()}>
                    + Add Slot
                  </button>
                </div>

                <div className="slots-admin-grid">
                  {guessBalanceSlots.length === 0 ? (
                    <div className="empty-state">
                      <p>No slots added yet. Add your first slot!</p>
                    </div>
                  ) : (
                    guessBalanceSlots.map((slot, index) => (
                      <div key={slot.id} className={`slot-admin-card ${slot.is_super ? 'super' : ''}`}>
                        <div className="slot-number">#{index + 1}</div>

                        {slot.slot_image_url ? (
                          <img src={slot.slot_image_url} alt={slot.slot_name} className="slot-admin-image" />
                        ) : (
                          <div className="slot-image-placeholder">🎰</div>
                        )}

                        <div className="slot-admin-info">
                          <h4>{slot.slot_name}</h4>
                          {slot.provider && <span className="provider">{slot.provider}</span>}
                          <div className="slot-stats">
                            <span>Bet: €{Number.parseFloat(slot.bet_value || 0).toFixed(2)}</span>
                            {slot.is_super && <span className="super-tag">⭐ SUPER</span>}
                          </div>
                          {slot.bonus_win !== null && (
                            <div className="slot-results">
                              <span>Win: €{Number.parseFloat(slot.bonus_win || 0).toFixed(2)}</span>
                              {slot.multiplier && <span>{slot.multiplier}x</span>}
                            </div>
                          )}
                        </div>

                        <div className="slot-admin-actions">
                          <button className="btn-edit-small" onClick={() => openSlotModal(slot)}>✏️</button>
                          <ConfirmButton
                            onConfirm={() => deleteSlot(slot.id)}
                            confirmText="?"
                            className="btn-delete-small"
                            variant="danger"
                          >
                            🗑️
                          </ConfirmButton>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Session Side Panel */}
          <SidePanel
            isOpen={showGuessBalanceModal}
            onClose={() => setShowGuessBalanceModal(false)}
            title={editingGuessSession ? 'Edit Session' : 'Create New Session'}
            size="xlarge"
            footer={
              <>
                <button type="button" className="btn-secondary" onClick={() => setShowGuessBalanceModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn-primary" onClick={(e) => {
                  e.preventDefault();
                  saveGuessSession(e);
                }}>
                  {editingGuessSession ? 'Update Session' : 'Create Session'}
                </button>
              </>
            }
          >
            <form className="guess-session-form">
                  {/* Transfer Password Quick Access */}
                  <div className="gtb-sidepanel-transfer">
                    <div className="gtb-sidepanel-transfer-header">
                      <span>🔑 Transfer Password</span>
                      {activeTransferPassword ? (
                        <span className="gtb-sp-badge gtb-sp-badge--active">Active</span>
                      ) : (
                        <span className="gtb-sp-badge gtb-sp-badge--none">None</span>
                      )}
                    </div>
                    <p className="gtb-sidepanel-transfer-desc">
                      Generate a password to send bonuses from the Overlay Bonus Hunt into a GTB session.
                    </p>
                    <div className="gtb-sidepanel-transfer-controls">
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={generateTransferPassword}
                        disabled={transferPasswordLoading}
                      >
                        {getTransferPasswordButtonLabel(transferPasswordLoading, activeTransferPassword)}
                      </button>
                      {activeTransferPassword && (
                        <button
                          type="button"
                          className="btn-delete"
                          onClick={revokeTransferPassword}
                        >
                          🗑️ Revoke
                        </button>
                      )}
                    </div>
                    {transferPassword && showTransferPassword && (
                      <div className="gtb-sidepanel-transfer-reveal">
                        <code className="gtb-transfer-password-value">{transferPassword}</code>
                        <button
                          type="button"
                          className="btn-copy"
                          onClick={() => {
                            navigator.clipboard.writeText(transferPassword);
                            setSuccess('Password copied!');
                          }}
                        >📋</button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                          onClick={() => { setShowTransferPassword(false); setTransferPassword(''); }}
                        >Dismiss</button>
                      </div>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="guess-session-title">Title *</label>
                      <input
                        id="guess-session-title"
                        type="text"
                        value={guessSessionFormData.title}
                        onChange={(e) => setGuessSessionFormData({...guessSessionFormData, title: e.target.value})}
                        placeholder="e.g., Guess the Balance #1"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="guess-session-status">Status</label>
                      <select
                        id="guess-session-status"
                        value={guessSessionFormData.status}
                        onChange={(e) => setGuessSessionFormData({...guessSessionFormData, status: e.target.value})}
                      >
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="guess-session-description">Description</label>
                    <textarea
                      id="guess-session-description"
                      value={guessSessionFormData.description}
                      onChange={(e) => setGuessSessionFormData({...guessSessionFormData, description: e.target.value})}
                      placeholder="Optional description..."
                      rows={2}
                    />
                  </div>

                  <div className="form-section-title">💵 Money Settings</div>
                  <div className="form-row two-cols">
                    <div className="form-group">
                      <label htmlFor="guess-session-start-value">Start Value (€)</label>
                      <input
                        id="guess-session-start-value"
                        type="number"
                        step="0.01"
                        value={guessSessionFormData.start_value}
                        onChange={(e) => setGuessSessionFormData({...guessSessionFormData, start_value: e.target.value})}
                        placeholder="1000.00"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="guess-session-final-balance">Final Balance (€)</label>
                      <input
                        id="guess-session-final-balance"
                        type="number"
                        step="0.01"
                        value={guessSessionFormData.final_balance}
                        onChange={(e) => setGuessSessionFormData({...guessSessionFormData, final_balance: e.target.value})}
                        placeholder="Set when session ends"
                      />
                      <small className="form-hint">Set when session ends</small>
                    </div>
                  </div>
                  <div className="form-row two-cols">
                    <div className="form-group">
                      <label htmlFor="guess-session-amount-expended">Amount Expended (€)</label>
                      <input
                        id="guess-session-amount-expended"
                        type="number"
                        step="0.01"
                        value={sessionSlotsInModal.reduce((sum, s) => sum + (Number.parseFloat(s.bet_value) || 0), 0).toFixed(2)}
                        readOnly
                        className="readonly-input"
                      />
                      <small className="form-hint">Auto-calculated from slots</small>
                    </div>
                    <div className="form-group">
                      <label htmlFor="guess-session-be-multiplier">BE Multiplier (x)</label>
                      <input
                        id="guess-session-be-multiplier"
                        type="number"
                        step="0.01"
                        value={(() => {
                          const startVal = Number.parseFloat(guessSessionFormData.start_value) || 0;
                          const finalBal = Number.parseFloat(guessSessionFormData.final_balance) || 0;
                          const totalBets = sessionSlotsInModal.reduce((sum, s) => sum + (Number.parseFloat(s.bet_value) || 0), 0);
                          if (startVal > 0 && totalBets > 0 && finalBal > 0) {
                            return ((finalBal / startVal) / totalBets).toFixed(2);
                          }
                          return '';
                        })()}
                        readOnly
                        className="readonly-input"
                        placeholder="Auto-calculated"
                      />
                      <small className="form-hint">= (Final ├À Start) ├À Total Bets</small>
                    </div>
                  </div>

                  <div className="form-section-title">🏰 Casino Info</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="guess-session-casino-brand">Casino Brand</label>
                      <input
                        id="guess-session-casino-brand"
                        type="text"
                        value={guessSessionFormData.casino_brand}
                        onChange={(e) => setGuessSessionFormData({...guessSessionFormData, casino_brand: e.target.value})}
                        placeholder="e.g., Stake, Rollbit..."
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="guess-session-casino-logo">Casino Logo URL</label>
                      <input
                        id="guess-session-casino-logo"
                        type="url"
                        value={guessSessionFormData.casino_image_url}
                        onChange={(e) => setGuessSessionFormData({...guessSessionFormData, casino_image_url: e.target.value})}
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="form-section-title">⚙️ Settings</div>
                  <div className="form-row checkboxes">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={guessSessionFormData.is_guessing_open}
                        onChange={(e) => setGuessSessionFormData({...guessSessionFormData, is_guessing_open: e.target.checked})}
                      />
                      <span>Guessing Open (users can submit guesses)</span>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={guessSessionFormData.reveal_answer}
                        onChange={(e) => setGuessSessionFormData({...guessSessionFormData, reveal_answer: e.target.checked})}
                      />
                      <span>Reveal Answer (show final balance to users)</span>
                    </label>
                  </div>

                  {/* Slot Selection Section */}
                  <div className="form-section-title">🎰 Add Slots</div>

                  {/* Slot Search & Add Controls */}
                  <div className="slot-picker-section">
                    <div className="slot-picker-controls">
                      <div className="form-group slot-search-group">
                        <label htmlFor="guess-session-slot-search">Search Slots</label>
                        <input
                          id="guess-session-slot-search"
                          type="text"
                          value={slotSearchQuery}
                          onChange={(e) => setSlotSearchQuery(e.target.value)}
                          placeholder="Type to search slots..."
                          className="slot-search-input"
                        />
                      </div>
                      <div className="slot-picker-row">
                        <div className="form-group bet-group">
                          <label htmlFor="guess-session-new-slot-bet">Bet Value (€)</label>
                          <input
                            id="guess-session-new-slot-bet"
                            type="number"
                            step="0.01"
                            value={newSlotBetValue}
                            onChange={(e) => setNewSlotBetValue(Number.parseFloat(e.target.value) || 0)}
                            placeholder="1.00"
                            className="bet-input"
                          />
                        </div>
                        <div className="form-group checkbox-group">
                          <label className="checkbox-label super-checkbox">
                            <input
                              type="checkbox"
                              checked={newSlotIsSuper}
                              onChange={(e) => setNewSlotIsSuper(e.target.checked)}
                            />
                            <span>⭐ Super</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Slot Catalog Results */}
                    {slotSearchQuery && (
                      <div className="slot-catalog-results">
                        <div className="catalog-debug" style={{fontSize: '0.75rem', color: '#6b7280', marginBottom: '8px'}}>
                          Searching in {slotCatalog.length} slots • Found {filteredSlotCatalog.length} matches
                        </div>
                        {filteredSlotCatalog.length === 0 ? (
                          <div className="no-results">No slots found matching "{slotSearchQuery}"</div>
                        ) : (
                          <div className="slot-catalog-grid">
                            {filteredSlotCatalog.slice(0, 20).map((slot) => (
                              <button
                                type="button"
                                key={slot.id}
                                className="slot-catalog-item"
                                onClick={() => addSlotToSession(slot)}
                              >
                                <img src={slot.image} alt={slot.name} className="slot-catalog-image" />
                                <div className="slot-catalog-info">
                                  <span className="slot-catalog-name">{slot.name}</span>
                                  <span className="slot-catalog-provider">{slot.provider}</span>
                                </div>
                                <span className="add-slot-btn" aria-hidden="true">+</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Added Slots List */}
                  <div className="session-slots-list">
                    <div className="slots-list-header">
                      <span>Added Slots ({sessionSlotsInModal.length})</span>
                      <span className="total-bets">Total Bets: €{sessionSlotsInModal.reduce((sum, s) => sum + (Number.parseFloat(s.bet_value) || 0), 0).toFixed(2)}</span>
                    </div>

                    {sessionSlotsInModal.length === 0 ? (
                      <div className="no-slots-added">
                        <p>No slots added yet. Search and add slots above.</p>
                      </div>
                    ) : (
                      <div className="added-slots-grid">
                        {sessionSlotsInModal.map((slot, index) => (
                          <div key={slot.id || slot.tempId} className={`added-slot-item ${slot.is_super ? 'super' : ''}`}>
                            <span className="slot-order">#{index + 1}</span>
                            {slot.slot_image_url ? (
                              <img src={slot.slot_image_url} alt={slot.slot_name} className="added-slot-image" />
                            ) : (
                              <div className="added-slot-placeholder">🎰</div>
                            )}
                            <div className="added-slot-info">
                              <span className="added-slot-name">{slot.slot_name}</span>
                              <span className="added-slot-provider">{slot.provider}</span>
                            </div>
                            <span className="added-slot-bet">€{Number.parseFloat(slot.bet_value || 0).toFixed(2)}</span>
                            {slot.is_super && <span className="super-badge">⭐</span>}
                            <button
                              type="button"
                              className="remove-slot-btn"
                              onClick={() => removeSlotFromSession(index)}
                            >
                              ├ù
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </form>
          </SidePanel>

          {/* Slot Side Panel */}
          <SidePanel
            isOpen={showSlotModal}
            onClose={() => setShowSlotModal(false)}
            title={editingSlot ? 'Edit Slot' : 'Add New Slot'}
            size="medium"
            footer={
              <>
                <button type="button" className="btn-secondary" onClick={() => setShowSlotModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn-primary" onClick={(e) => {
                  e.preventDefault();
                  saveSlot(e);
                }}>
                  {editingSlot ? 'Update Slot' : 'Add Slot'}
                </button>
              </>
            }
          >
            <form className="slot-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="guess-slot-name">Slot Name *</label>
                      <input
                        id="guess-slot-name"
                        type="text"
                        value={slotFormData.slot_name}
                        onChange={(e) => setSlotFormData({...slotFormData, slot_name: e.target.value})}
                        placeholder="e.g., Gates of Olympus"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="guess-slot-provider">Provider</label>
                      <input
                        id="guess-slot-provider"
                        type="text"
                        value={slotFormData.provider}
                        onChange={(e) => setSlotFormData({...slotFormData, provider: e.target.value})}
                        placeholder="e.g., Pragmatic Play"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="guess-slot-image-url">Slot Image URL</label>
                    <input
                      id="guess-slot-image-url"
                      type="url"
                      value={slotFormData.slot_image_url}
                      onChange={(e) => setSlotFormData({...slotFormData, slot_image_url: e.target.value})}
                      placeholder="https://..."
                    />
                    {slotFormData.slot_image_url && (
                      <img src={slotFormData.slot_image_url} alt="Preview" className="image-preview" />
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="guess-slot-bet-value">Bet Value (€)</label>
                      <input
                        id="guess-slot-bet-value"
                        type="number"
                        step="0.01"
                        value={slotFormData.bet_value}
                        onChange={(e) => setSlotFormData({...slotFormData, bet_value: e.target.value})}
                        placeholder="1.00"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="guess-slot-display-order">Display Order</label>
                      <input
                        id="guess-slot-display-order"
                        type="number"
                        value={slotFormData.display_order}
                        onChange={(e) => setSlotFormData({...slotFormData, display_order: e.target.value})}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="form-group checkbox-inline">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={slotFormData.is_super}
                        onChange={(e) => setSlotFormData({...slotFormData, is_super: e.target.checked})}
                      />
                      <span>⭐ Is Super/Bonus Slot</span>
                    </label>
                  </div>

                  <div className="form-section-title">🏆 Results (optional - fill when bonus opens)</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="guess-slot-bonus-win">Bonus Win (€)</label>
                      <input
                        id="guess-slot-bonus-win"
                        type="number"
                        step="0.01"
                        value={slotFormData.bonus_win}
                        onChange={(e) => setSlotFormData({...slotFormData, bonus_win: e.target.value})}
                        placeholder="Leave empty until opened"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="guess-slot-multiplier">Multiplier (x)</label>
                      <input
                        id="guess-slot-multiplier"
                        type="number"
                        step="0.01"
                        value={slotFormData.multiplier}
                        onChange={(e) => setSlotFormData({...slotFormData, multiplier: e.target.value})}
                        placeholder="e.g., 150"
                      />
                    </div>
                  </div>
                </form>
          </SidePanel>

          {/* Slot Results Entry Side Panel */}
          <SidePanel
            isOpen={showSlotResultsModal && guessBalanceSlots && guessBalanceSlots.length > 0}
            onClose={() => setShowSlotResultsModal(false)}
            title="🎯 Enter Slot Results"
            size="large"
            footer={
              <>
                <button
                  className="btn-save-result"
                  onClick={() => saveSlotResult(guessBalanceSlots[currentSlotIndex])}
                >
                  💾 Save & Continue
                </button>
                <button
                  className="btn-save-all"
                  onClick={async () => {
                    for (const slot of guessBalanceSlots) {
                      if (slot.bonus_win !== null && slot.bonus_win !== '') {
                        await saveSlotResult(slot, false);
                      }
                    }
                    showNotification('All results saved!', 'success');
                    setShowSlotResultsModal(false);
                  }}
                >
                  ✅ Save All & Close
                </button>
              </>
            }
          >
            <div className="slot-results-content">
                  {/* Progress indicator */}
                  <div className="slot-results-progress">
                    <span>Slot {currentSlotIndex + 1} of {guessBalanceSlots.length}</span>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${((currentSlotIndex + 1) / guessBalanceSlots.length) * 100}%` }}
                      />
                    </div>
                    <span className="completed-count">
                      {guessBalanceSlots.filter(s => s.bonus_win !== null && s.bonus_win !== '').length} completed
                    </span>
                  </div>

                  {/* Current slot display */}
                  {(() => {
                    const currentSlot = guessBalanceSlots[currentSlotIndex];
                    if (!currentSlot) return null;

                    return (
                      <div className="current-slot-display">
                        <div className="slot-image-large">
                          {currentSlot.slot_image_url ? (
                            <img src={currentSlot.slot_image_url} alt={currentSlot.slot_name} />
                          ) : (
                            <div className="no-image-large">🎰</div>
                          )}
                          {currentSlot.is_super && <span className="super-badge-large">⭐ SUPER</span>}
                        </div>

                        <div className="slot-info-large">
                          <h3>{currentSlot.slot_name}</h3>
                          {currentSlot.provider && <p className="slot-provider">{currentSlot.provider}</p>}
                          <p className="slot-bet">Bet: €{currentSlot.bet_value || '0.00'}</p>
                        </div>

                        <div className="result-inputs">
                          <div className="input-group">
                            <label htmlFor={`slot-result-bonus-win-${currentSlot.id}`}>💰 Bonus Win (€)</label>
                            <input
                              id={`slot-result-bonus-win-${currentSlot.id}`}
                              type="number"
                              step="0.01"
                              value={currentSlot.bonus_win || ''}
                              onChange={(e) => {
                                const updatedSlots = [...guessBalanceSlots];
                                updatedSlots[currentSlotIndex] = {
                                  ...currentSlot,
                                  bonus_win: e.target.value
                                };
                                setGuessBalanceSlots(updatedSlots);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  // Save current and move to next slot
                                  if (currentSlotIndex < guessBalanceSlots.length - 1) {
                                    goToSlot(currentSlotIndex + 1);
                                  }
                                }
                              }}
                              placeholder="Enter win amount..."
                              autoFocus
                            />
                          </div>
                          {currentSlot.bet_value && currentSlot.bonus_win && (
                            <div className="auto-multiplier">
                              📊 Multiplier: {(Number.parseFloat(currentSlot.bonus_win) / Number.parseFloat(currentSlot.bet_value)).toFixed(2)}x
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Navigation */}
                  <div className="slot-results-navigation">
                    <button
                      className="btn-nav"
                      onClick={() => goToSlot(currentSlotIndex - 1)}
                      disabled={currentSlotIndex === 0}
                    >
                      ← Previous
                    </button>

                    <div className="slot-dots">
                      {guessBalanceSlots.map((slot, idx) => (
                        <button
                          key={slot.id}
                          className={`dot ${idx === currentSlotIndex ? 'active' : ''} ${slot.bonus_win ? 'completed' : ''}`}
                          onClick={() => goToSlot(idx)}
                          title={slot.slot_name}
                        />
                      ))}
                    </div>

                    <button
                      className="btn-nav"
                      onClick={() => goToSlot(currentSlotIndex + 1)}
                      disabled={currentSlotIndex === guessBalanceSlots.length - 1}
                    >
                      Next →
                    </button>
                  </div>
                </div>
          </SidePanel>

          {/* Guesses List Side Panel */}
          <SidePanel
            isOpen={showGuessesModal}
            onClose={() => setShowGuessesModal(false)}
            title={`💡 Player Guesses - ${selectedSessionForSlots?.title || ''}`}
            size="large"
          >
            <div className="guesses-list-container">
              {sessionGuesses.length === 0 ? (
                <div className="empty-state">
                  <p>No guesses submitted yet for this session.</p>
                </div>
              ) : (
                <>
                  <div className="guesses-summary">
                    <span className="total-guesses">Total: {sessionGuesses.length} guesses</span>
                  </div>
                  <div className="guesses-table-wrapper">
                    <table className="guesses-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Player</th>
                          <th>Guess</th>
                          <th>Time</th>
                          <th>Winner?</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionGuesses.map((guess, index) => (
                          <tr key={guess.id} className={guess.is_winner ? 'winner-row' : ''}>
                            <td>{index + 1}</td>
                            <td>{guess.display_name || 'Anonymous'}</td>
                            <td className="guess-amount">€{Number.parseFloat(guess.guessed_balance).toFixed(2)}</td>
                            <td className="guess-time">{new Date(guess.guessed_at).toLocaleString()}</td>
                            <td>{guess.is_winner ? '🏆 Winner!' : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </SidePanel>

          {/* Votes List Side Panel */}
          <SidePanel
            isOpen={showVotesModal}
            onClose={() => setShowVotesModal(false)}
            title={`🗳️ Slot Votes - ${selectedSessionForSlots?.title || ''}`}
            size="large"
          >
            <div className="votes-list-container">
              {sessionVotes.length === 0 ? (
                <div className="empty-state">
                  <p>No votes cast yet for this session.</p>
                </div>
              ) : (
                <>
                  <div className="votes-summary">
                    <span className="total-votes">Total: {sessionVotes.length} votes</span>
                    <span className="best-votes">👍 Best: {sessionVotes.filter(v => v.vote_type === 'best').length}</span>
                    <span className="worst-votes">👎 Worst: {sessionVotes.filter(v => v.vote_type === 'worst').length}</span>
                  </div>
                  <div className="votes-table-wrapper">
                    <table className="votes-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Player</th>
                          <th>Slot</th>
                          <th>Vote</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionVotes.map((vote, index) => (
                          <tr key={vote.id} className={`vote-row ${vote.vote_type}`}>
                            <td>{index + 1}</td>
                            <td>{vote.display_name || 'Anonymous'}</td>
                            <td className="slot-name">{vote.slot_name}</td>
                            <td className={`vote-type ${vote.vote_type}`}>
                              {vote.vote_type === 'best' ? '👍 Best' : '👎 Worst'}
                            </td>
                            <td className="vote-time">{new Date(vote.voted_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </SidePanel>
        </>
      </Show>

      {/* API Keys Tab */}
      <Show when={activeTab === 'apikeys'}>
        <ApiKeysAdmin />
      </Show>
    </div>
  );
}
