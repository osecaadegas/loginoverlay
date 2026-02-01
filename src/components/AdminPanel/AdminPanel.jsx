import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAdmin } from '../../hooks/useAdmin';
import { getAllUsers, updateUserRole, revokeUserAccess, deleteUser, MODERATOR_PERMISSIONS, getUserRoles, addUserRole, removeUserRole } from '../../utils/adminUtils';
import { supabase } from '../../config/supabaseClient';
import { DEPOSIT_METHODS } from '../../utils/depositMethods';
import './AdminPanel.css';
import './AdminPanel.new.css';
import SeasonPassAdmin from './SeasonPassAdmin';
import { CasinoOfferModal } from './modals';
import { 
  TabNavigation, 
  SidePanel, 
  StatsCard, 
  StatsGrid,
  ConfirmButton,
  StickyToolbar,
  ToolbarGroup,
  ToolbarButton,
  ToolbarSearch,
  MasterDetail,
  DetailSection,
  DetailField,
  FormPanel,
  FormSection,
  StatGrid,
  StatField,
  FormRow,
  FormField,
  ImagePreview,
  InfoCard,
  ToggleField,
  QuickStats,
  Divider,
  ControlBlock,
  ControlInput,
  LiveOutput,
  InputGrid,
} from './components';

// Valid tab IDs for URL deep linking
const VALID_TABS = ['users', 'offers', 'thelife', 'wheel', 'wipe', 'seasonpass', 'guessbalance'];

export default function AdminPanel() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Pending confirmation state (replaces confirm() dialogs)
  const [pendingAction, setPendingAction] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [offerSearch, setOfferSearch] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;
  
  // Get initial tab from URL or default to 'users'
  const getInitialTab = () => {
    const tabFromUrl = searchParams.get('tab');
    return VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'users';
  };
  
  // Offer Card Builder State
  const [activeTab, setActiveTab] = useState(getInitialTab); // 'users', 'offers', 'thelife', 'wheel', 'wipe', 'seasonpass', 'guessbalance'
  const [offers, setOffers] = useState([]);
  const [editingOffer, setEditingOffer] = useState(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerFormData, setOfferFormData] = useState({
    casino_name: '',
    title: '',
    image_url: '',
    bonus_link: '',
    badge: '',
    badge_class: '',
    min_deposit: '',
    cashback: '',
    bonus_value: '',
    free_spins: '',
    deposit_methods: '',
    vpn_friendly: false,
    is_premium: false,
    details: '',
    is_active: true,
    display_order: 0,
    game_providers: '',
    total_games: '',
    license: '',
    welcome_bonus: ''
  });

  // The Life Management State
  const [theLifeTab, setTheLifeTab] = useState('crimes'); // 'crimes', 'businesses', 'items', 'workers', 'messages', 'categories', 'boats'
  const [crimes, setCrimes] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [items, setItems] = useState([]);
  const [storeItems, setStoreItems] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [eventMessages, setEventMessages] = useState([]);
  const [categoryInfoList, setCategoryInfoList] = useState([]);
  const [boats, setBoats] = useState([]);
  const [showCrimeModal, setShowCrimeModal] = useState(false);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showEventMessageModal, setShowEventMessageModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBoatModal, setShowBoatModal] = useState(false);
  const [editingCrime, setEditingCrime] = useState(null);
  const [editingBusiness, setEditingBusiness] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editingStoreItem, setEditingStoreItem] = useState(null);
  const [editingWorker, setEditingWorker] = useState(null);
  const [editingEventMessage, setEditingEventMessage] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingBoat, setEditingBoat] = useState(null);
  const [boatFormData, setBoatFormData] = useState({
    name: '',
    image_url: '',
    item_id: '',
    arrival_time: '',
    departure_time: '',
    max_shipments: 100,
    is_active: true
  });
  const [crimeFormData, setCrimeFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    min_level_required: 1,
    stamina_cost: 1,
    base_reward: 100,
    max_reward: 500,
    success_rate: 50,
    jail_time_minutes: 30,
    hp_loss_on_fail: 10,
    xp_reward: 10
  });
  const [crimeDrops, setCrimeDrops] = useState([]);
  const [newDrop, setNewDrop] = useState({
    item_id: '',
    drop_chance: 10,
    min_quantity: 1,
    max_quantity: 1
  });
  const [itemFormData, setItemFormData] = useState({
    name: '',
    description: '',
    type: 'item',
    icon: '📦',
    rarity: 'common',
    tradeable: false,
    usable: false,
    effect: ''
  });
  const [itemEffectType, setItemEffectType] = useState('');
  const [itemEffectValue, setItemEffectValue] = useState(0);
  const [itemAddictionAmount, setItemAddictionAmount] = useState(0);
  const [itemResellPrice, setItemResellPrice] = useState(0);
  const [itemBoostType, setItemBoostType] = useState(''); // 'power', 'defense', 'intelligence', ''
  const [itemBoostAmount, setItemBoostAmount] = useState(0);
  const [itemMaxDurability, setItemMaxDurability] = useState(0); // 0 = infinite
  const [itemSellableOnStreets, setItemSellableOnStreets] = useState(false);
  const [itemSellableAtDocks, setItemSellableAtDocks] = useState(false);
  const [itemFilterType, setItemFilterType] = useState('all');
  const [itemFilterRarity, setItemFilterRarity] = useState('all');
  const [businessFormData, setBusinessFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    cost: 500,
    profit: 1500,
    duration_minutes: 30,
    min_level_required: 1,
    is_active: true,
    reward_type: 'cash',
    reward_item_id: null,
    reward_item_quantity: 1,
    purchase_price: 5000,
    production_cost: 500,
    stamina_cost: 5,
    item_quantity: 10,
    unit_name: 'grams',
    conversion_rate: null
  });
  const [businessRequiredItems, setBusinessRequiredItems] = useState([]);
  const [newRequiredItem, setNewRequiredItem] = useState({
    item_id: '',
    quantity_required: 1,
    reward_cash: 0,
    reward_item_id: null,
    reward_item_quantity: 1
  });
  const [workerFormData, setWorkerFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    hire_cost: 1000,
    income_per_hour: 100,
    rarity: 'common',
    min_level_required: 1,
    is_active: true
  });
  const [eventMessageFormData, setEventMessageFormData] = useState({
    event_type: 'jail_crime',
    message: '',
    image_url: '',
    is_active: true
  });
  const [categoryFormData, setCategoryFormData] = useState({
    category_key: '',
    category_name: '',
    description: '',
    image_url: ''
  });
  const [storeFormData, setStoreFormData] = useState({
    item_id: '',
    category: 'healing',
    price: 0,
    stock_quantity: null,
    is_active: true,
    display_order: 0,
    limited_time_until: ''
  });
  const [uploadingCategoryImage, setUploadingCategoryImage] = useState(false);
  const [availableItems, setAvailableItems] = useState([]);

  // Scroll refs for arrow navigation
  const businessesScrollRef = useRef(null);
  const crimesScrollRef = useRef(null);
  const itemsScrollRef = useRef(null);
  const workersScrollRef = useRef(null);
  const categoriesScrollRef = useRef(null);
  const storeScrollRef = useRef(null);

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

  // Wipe Settings State
  const [wipeSettings, setWipeSettings] = useState({
    wipe_inventory: false,
    wipe_cash: false,
    wipe_bank: false,
    wipe_level: false,
    wipe_skills: false,
    wipe_businesses: false,
    wipe_upgrades: false,
    wipe_brothel_workers: false,
    wipe_stocks: false,
    wipe_addiction: false,
    wipe_health_stamina: false,
    wipe_jail_hospital: false,
    wipe_pvp_stats: false,
    wipe_casino_history: false,
    wipe_dock_shipments: false,
    wipe_game_leaderboard: false,
    wipe_player_progress: false,
    scheduled_at: '',
    is_active: false,
    is_recurring: false,
    recurrence_months: 3
  });
  const [wipeSaving, setWipeSaving] = useState(false);

  // Handle tab change with URL deep linking
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // Sync tab with URL on browser back/forward
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && VALID_TABS.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    loadUsers();
    loadOffers();
    loadCrimes();
    loadBusinesses();
    loadItems();
    loadStoreItems();
    loadWorkers();
    loadBoats();
    loadWheelPrizes();
    loadEventMessages();
    loadCategoryInfo();
    loadWipeSettings();
    loadGuessBalanceSessions();
  }, []);

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

  const handleRoleChange = async (userId, role, expiresAt, moderatorPermissions = null) => {
    setError('');
    setSuccess('');
    
    const { error } = await updateUserRole(userId, role, expiresAt, moderatorPermissions);
    
    if (error) {
      setError('Failed to update role: ' + error.message);
    } else {
      setSuccess('User role updated successfully!');
      setEditingUser(null);
      loadUsers();
    }
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
    if (!editingUser || !editingUser.newRole) return;
    
    setError('');
    setSuccess('');
    
    let expiresAt = null;
    if (editingUser.newRoleExpiryDays && editingUser.newRoleExpiryDays > 0) {
      const date = new Date();
      date.setDate(date.getDate() + parseInt(editingUser.newRoleExpiryDays));
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

  const openOfferModal = (offer = null) => {
    if (offer) {
      setOfferFormData(offer);
      setEditingOffer(offer);
    } else {
      setOfferFormData({
        casino_name: '',
        title: '',
        image_url: '',
        list_image_url: '',
        bonus_link: '',
        badge: '',
        badge_class: '',
        min_deposit: '',
        cashback: '',
        bonus_value: '',
        free_spins: '',
        is_premium: false,
        details: '',
        is_active: true,
        display_order: offers.length,
        deposit_methods: '',
        vpn_friendly: false,
        game_providers: '',
        total_games: '',
        license: '',
        welcome_bonus: ''
      });
      setEditingOffer(null);
    }
    setShowOfferModal(true);
  };

  const closeOfferModal = () => {
    setShowOfferModal(false);
    setEditingOffer(null);
    setOfferFormData({
      casino_name: '',
      title: '',
      image_url: '',
      list_image_url: '',
      bonus_link: '',
      badge: '',
      badge_class: '',
      min_deposit: '',
      cashback: '',
      bonus_value: '',
      free_spins: '',
      deposit_methods: '',
      vpn_friendly: false,
      is_premium: false,
      details: '',
      is_active: true,
      display_order: 0,
      game_providers: '',
      total_games: '',
      license: '',
      welcome_bonus: ''
    });
  };

  const handleOfferFormChange = (field, value) => {
    setOfferFormData({ ...offerFormData, [field]: value });
  };

  const saveOffer = async () => {
    setError('');
    setSuccess('');

    if (!offerFormData.casino_name || !offerFormData.title || !offerFormData.image_url) {
      setError('Please fill in required fields: Casino Name, Title, and Image URL');
      return;
    }

    try {
      if (editingOffer) {
        // Update existing offer
        const { error } = await supabase
          .from('casino_offers')
          .update(offerFormData)
          .eq('id', editingOffer.id);

        if (error) throw error;
        setSuccess('Offer updated successfully!');
      } else {
        // Create new offer
        const { error } = await supabase
          .from('casino_offers')
          .insert([{ ...offerFormData, created_by: (await supabase.auth.getUser()).data.user?.id }]);

        if (error) throw error;
        setSuccess('Offer created successfully!');
      }

      closeOfferModal();
      loadOffers();
    } catch (err) {
      setError('Failed to save offer: ' + err.message);
    }
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

  // === THE LIFE MANAGEMENT FUNCTIONS ===
  
  const loadCrimes = async () => {
    try {
      const { data, error } = await supabase
        .from('the_life_robberies')
        .select('*')
        .order('min_level_required', { ascending: true });
      
      if (error) {
        console.error('Error loading crimes:', error);
        setError('Failed to load crimes: ' + error.message);
      } else {
        console.log('Loaded crimes:', data);
        setCrimes(data || []);
      }
    } catch (err) {
      console.error('Exception loading crimes:', err);
      setError('Failed to load crimes: ' + err.message);
    }
  };

  const loadItems = async () => {
    const { data, error } = await supabase
      .from('the_life_items')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error loading items:', error);
    } else {
      setItems(data || []);
      setAvailableItems(data || []);
    }
  };

  const loadStoreItems = async () => {
    const { data, error } = await supabase
      .from('the_life_store_items')
      .select(`
        *,
        item:the_life_items(*)
      `)
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('Error loading store items:', error);
    } else {
      setStoreItems(data || []);
    }
  };

  const loadEventMessages = async () => {
    const { data, error } = await supabase
      .from('the_life_event_messages')
      .select('*')
      .order('event_type', { ascending: true });
    
    if (error) {
      console.error('Error loading event messages:', error);
    } else {
      setEventMessages(data || []);
    }
  };

  const openCrimeModal = async (crime = null) => {
    if (crime) {
      setCrimeFormData({
        name: crime.name,
        description: crime.description || '',
        image_url: crime.image_url || '',
        min_level_required: crime.min_level_required,
        stamina_cost: crime.stamina_cost || crime.ticket_cost || 1,
        base_reward: crime.base_reward,
        max_reward: crime.max_reward,
        success_rate: crime.success_rate,
        jail_time_minutes: crime.jail_time_minutes,
        hp_loss_on_fail: crime.hp_loss_on_fail,
        xp_reward: crime.xp_reward
      });
      setEditingCrime(crime);
      
      // Load crime drops
      const { data: drops } = await supabase
        .from('the_life_crime_drops')
        .select(`
          *,
          item:the_life_items(id, name, icon)
        `)
        .eq('crime_id', crime.id);
      setCrimeDrops(drops || []);
    } else {
      setCrimeFormData({
        name: '',
        description: '',
        image_url: '',
        min_level_required: 1,
        stamina_cost: 1,
        base_reward: 100,
        max_reward: 500,
        success_rate: 50,
        jail_time_minutes: 30,
        hp_loss_on_fail: 10,
        xp_reward: 10
      });
      setEditingCrime(null);
      setCrimeDrops([]);
    }
    setNewDrop({
      item_id: '',
      drop_chance: 10,
      min_quantity: 1,
      max_quantity: 1
    });
    setShowCrimeModal(true);
  };

  const closeCrimeModal = () => {
    setShowCrimeModal(false);
    setEditingCrime(null);
  };

  const saveCrime = async () => {
    setError('');
    setSuccess('');

    if (!crimeFormData.name) {
      setError('Crime name is required');
      return;
    }

    try {
      if (editingCrime) {
        // Update existing crime
        const { data, error } = await supabase
          .from('the_life_robberies')
          .update({
            name: crimeFormData.name,
            description: crimeFormData.description,
            image_url: crimeFormData.image_url,
            min_level_required: parseInt(crimeFormData.min_level_required),
            stamina_cost: parseInt(crimeFormData.stamina_cost),
            base_reward: parseInt(crimeFormData.base_reward),
            max_reward: parseInt(crimeFormData.max_reward),
            success_rate: parseInt(crimeFormData.success_rate),
            jail_time_minutes: parseInt(crimeFormData.jail_time_minutes),
            hp_loss_on_fail: parseInt(crimeFormData.hp_loss_on_fail),
            xp_reward: parseInt(crimeFormData.xp_reward)
          })
          .eq('id', editingCrime.id)
          .select();

        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        
        console.log('Crime updated:', data);
        setSuccess('Crime updated successfully!');
      } else {
        // Create new crime
        const { data, error} = await supabase
          .from('the_life_robberies')
          .insert([{
            name: crimeFormData.name,
            description: crimeFormData.description,
            image_url: crimeFormData.image_url,
            min_level_required: parseInt(crimeFormData.min_level_required),
            stamina_cost: parseInt(crimeFormData.stamina_cost),
            base_reward: parseInt(crimeFormData.base_reward),
            max_reward: parseInt(crimeFormData.max_reward),
            success_rate: parseInt(crimeFormData.success_rate),
            jail_time_minutes: parseInt(crimeFormData.jail_time_minutes),
            hp_loss_on_fail: parseInt(crimeFormData.hp_loss_on_fail),
            xp_reward: parseInt(crimeFormData.xp_reward),
            is_active: true
          }])
          .select();

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }

        console.log('Crime created:', data);
        setSuccess('Crime created successfully!');
      }

      closeCrimeModal();
      await loadCrimes();
    } catch (err) {
      console.error('Save crime error:', err);
      setError('Failed to save crime: ' + err.message);
    }
  };

  const deleteCrime = async (crimeId) => {
    setError('');
    setSuccess('');

    try {
      console.log('Deleting crime:', crimeId);
      
      const { error } = await supabase
        .from('the_life_robberies')
        .delete()
        .eq('id', crimeId);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      
      console.log('Crime deleted successfully:', crimeId);
      
      // Immediately remove from state
      setCrimes(prevCrimes => prevCrimes.filter(c => c.id !== crimeId));
      
      setSuccess('Crime deleted successfully!');
      
      // Also reload to ensure consistency
      setTimeout(() => loadCrimes(), 100);
    } catch (err) {
      console.error('Delete crime error:', err);
      setError('Failed to delete crime: ' + err.message);
    }
  };

  const addCrimeDrop = async () => {
    if (!editingCrime || !newDrop.item_id) {
      setError('Please select an item');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('the_life_crime_drops')
        .insert({
          crime_id: editingCrime.id,
          item_id: newDrop.item_id,
          drop_chance: parseInt(newDrop.drop_chance),
          min_quantity: parseInt(newDrop.min_quantity),
          max_quantity: parseInt(newDrop.max_quantity)
        })
        .select(`
          *,
          item:the_life_items(id, name, icon)
        `)
        .single();

      if (error) throw error;

      setCrimeDrops([...crimeDrops, data]);
      setNewDrop({
        item_id: '',
        drop_chance: 10,
        min_quantity: 1,
        max_quantity: 1
      });
      setSuccess('Drop added successfully!');
    } catch (err) {
      console.error('Error adding drop:', err);
      setError('Failed to add drop: ' + err.message);
    }
  };

  const removeCrimeDrop = async (dropId) => {
    try {
      const { error } = await supabase
        .from('the_life_crime_drops')
        .delete()
        .eq('id', dropId);

      if (error) throw error;

      setCrimeDrops(crimeDrops.filter(d => d.id !== dropId));
      setSuccess('Drop removed successfully!');
    } catch (err) {
      console.error('Error removing drop:', err);
      setError('Failed to remove drop: ' + err.message);
    }
  };

  const toggleCrimeActive = async (crime) => {
    setError('');
    
    try {
      const newActiveState = !crime.is_active;
      
      console.log('Toggling crime:', crime.id, 'to', newActiveState);
      
      const { data, error } = await supabase
        .from('the_life_robberies')
        .update({ is_active: newActiveState })
        .eq('id', crime.id)
        .select();

      if (error) {
        console.error('Toggle error:', error);
        throw error;
      }

      console.log('Crime toggled successfully:', data);
      
      // Immediately update state
      setCrimes(prevCrimes => 
        prevCrimes.map(c => 
          c.id === crime.id ? { ...c, is_active: newActiveState } : c
        )
      );
      
      setSuccess(`Crime ${newActiveState ? 'activated' : 'deactivated'} successfully!`);
      
      // Also reload to ensure consistency
      setTimeout(() => loadCrimes(), 100);
    } catch (err) {
      setError('Failed to toggle crime: ' + err.message);
    }
  };

  // Scroll Functions for Business Grid
  const scrollBusinesses = (direction) => {
    if (businessesScrollRef.current) {
      const scrollAmount = 300;
      businessesScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const scrollCrimes = (direction) => {
    if (crimesScrollRef.current) {
      const scrollAmount = 300;
      crimesScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const scrollItems = (direction) => {
    if (itemsScrollRef.current) {
      const scrollAmount = 300;
      itemsScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const scrollWorkers = (direction) => {
    if (workersScrollRef.current) {
      const scrollAmount = 300;
      workersScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const scrollStoreItems = (direction) => {
    if (storeScrollRef.current) {
      const scrollAmount = 300;
      storeScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const scrollCategories = (direction) => {
    if (categoriesScrollRef.current) {
      const scrollAmount = 300;
      categoriesScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Business Management Functions
  const loadBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('the_life_businesses')
        .select('*')
        .order('min_level_required', { ascending: true });

      if (error) throw error;
      setBusinesses(data || []);
    } catch (err) {
      console.error('Error loading businesses:', err);
    }
  };

  const loadBusinessRequiredItems = async (businessId) => {
    try {
      const { data, error } = await supabase
        .from('the_life_business_required_items')
        .select(`
          *,
          item:the_life_items!the_life_business_required_items_item_id_fkey(*),
          reward_item:the_life_items!the_life_business_required_items_reward_item_id_fkey(*)
        `)
        .eq('business_id', businessId);

      if (error) throw error;
      setBusinessRequiredItems(data || []);
    } catch (err) {
      console.error('Error loading business required items:', err);
      setBusinessRequiredItems([]);
    }
  };

  const openBusinessModal = (business = null) => {
    if (business) {
      setBusinessFormData({
        name: business.name,
        description: business.description || '',
        image_url: business.image_url || '',
        cost: business.cost,
        profit: business.profit,
        duration_minutes: business.duration_minutes,
        min_level_required: business.min_level_required,
        is_active: business.is_active,
        reward_type: business.reward_type || 'cash',
        reward_item_id: business.reward_item_id || null,
        reward_item_quantity: business.reward_item_quantity || 1,
        purchase_price: business.purchase_price || 5000,
        production_cost: business.production_cost || 500,
        stamina_cost: business.stamina_cost || business.ticket_cost || 5,
        required_item_id: business.required_item_id || null,
        required_item_quantity: business.required_item_quantity || 1,
        consumes_item: business.consumes_item !== false,
        variable_reward: business.variable_reward || false,
        conversion_rate: business.conversion_rate || null,
        is_upgradeable: business.is_upgradeable !== false
      });
      setEditingBusiness(business);
      loadBusinessRequiredItems(business.id);
    } else {
      setBusinessFormData({
        name: '',
        description: '',
        image_url: '',
        cost: 500,
        profit: 1500,
        duration_minutes: 30,
        min_level_required: 1,
        is_active: true,
        reward_type: 'cash',
        reward_item_id: null,
        reward_item_quantity: 1,
        purchase_price: 5000,
        production_cost: 500,
        stamina_cost: 5,
        required_item_id: null,
        required_item_quantity: 1,
        consumes_item: true,
        variable_reward: false,
        conversion_rate: null,
        is_upgradeable: true
      });
      setEditingBusiness(null);
      setBusinessRequiredItems([]);
    }
    setShowBusinessModal(true);
  };

  const closeBusinessModal = () => {
    setShowBusinessModal(false);
    setEditingBusiness(null);
    setBusinessRequiredItems([]);
    setNewRequiredItem({
      item_id: '',
      quantity_required: 1,
      reward_cash: 0,
      reward_item_id: null,
      reward_item_quantity: 1
    });
  };

  const addRequiredItem = async () => {
    if (!newRequiredItem.item_id) {
      setError('Please select an item');
      return;
    }

    if (!editingBusiness) {
      setError('Save the business first before adding required items');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('the_life_business_required_items')
        .insert({
          business_id: editingBusiness.id,
          item_id: newRequiredItem.item_id,
          quantity_required: newRequiredItem.quantity_required,
          reward_cash: newRequiredItem.reward_cash,
          reward_item_id: newRequiredItem.reward_item_id || null,
          reward_item_quantity: newRequiredItem.reward_item_quantity
        })
        .select(`
          *,
          item:the_life_items!the_life_business_required_items_item_id_fkey(*),
          reward_item:the_life_items!the_life_business_required_items_reward_item_id_fkey(*)
        `)
        .single();

      if (error) throw error;
      
      setBusinessRequiredItems([...businessRequiredItems, data]);
      setNewRequiredItem({
        item_id: '',
        quantity_required: 1,
        reward_cash: 0,
        reward_item_id: null,
        reward_item_quantity: 1
      });
      setSuccess('Required item added!');
    } catch (err) {
      console.error('Error adding required item:', err);
      setError('Failed to add required item: ' + err.message);
    }
  };

  const removeRequiredItem = async (requiredItemId) => {
    try {
      const { error } = await supabase
        .from('the_life_business_required_items')
        .delete()
        .eq('id', requiredItemId);

      if (error) throw error;
      
      setBusinessRequiredItems(businessRequiredItems.filter(ri => ri.id !== requiredItemId));
      setSuccess('Required item removed!');
    } catch (err) {
      console.error('Error removing required item:', err);
      setError('Failed to remove required item');
    }
  };

  const saveBusiness = async () => {
    setError('');
    setSuccess('');

    if (!businessFormData.name) {
      setError('Business name is required');
      return;
    }

    try {
      if (editingBusiness) {
        const { error } = await supabase
          .from('the_life_businesses')
          .update(businessFormData)
          .eq('id', editingBusiness.id);

        if (error) throw error;
        setSuccess('Business updated successfully!');
      } else {
        const { error } = await supabase
          .from('the_life_businesses')
          .insert([businessFormData]);

        if (error) throw error;
        setSuccess('Business created successfully!');
      }

      closeBusinessModal();
      loadBusinesses();
    } catch (err) {
      setError('Failed to save business: ' + err.message);
    }
  };

  const deleteBusiness = async (businessId) => {
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('the_life_businesses')
        .delete()
        .eq('id', businessId);

      if (error) throw error;
      setSuccess('Business deleted successfully!');
      loadBusinesses();
    } catch (err) {
      setError('Failed to delete business: ' + err.message);
    }
  };

  const toggleBusinessActive = async (business) => {
    try {
      const { error } = await supabase
        .from('the_life_businesses')
        .update({ is_active: !business.is_active })
        .eq('id', business.id);

      if (error) throw error;
      setSuccess(`Business ${!business.is_active ? 'activated' : 'deactivated'} successfully!`);
      loadBusinesses();
    } catch (err) {
      setError('Failed to toggle business: ' + err.message);
    }
  };

  const openItemModal = (item = null) => {
    if (item) {
      setItemFormData({
        name: item.name,
        description: item.description || '',
        type: item.type,
        icon: item.icon,
        rarity: item.rarity,
        tradeable: item.tradeable || false,
        usable: item.usable ?? true,
        effect: item.effect || ''
      });
      // Parse effect JSON to populate form fields
      try {
        if (item.effect) {
          const effectObj = JSON.parse(item.effect);
          setItemEffectType(effectObj.type || '');
          setItemEffectValue(effectObj.value || 0);
          setItemAddictionAmount(effectObj.addiction || 0);
        } else {
          setItemEffectType('');
          setItemEffectValue(0);
          setItemAddictionAmount(0);
        }
      } catch {
        setItemEffectType('');
        setItemEffectValue(0);
        setItemAddictionAmount(0);
      }
      // Parse resell price if exists
      setItemResellPrice(item.resell_price || 0);
      // Parse boost fields
      setItemBoostType(item.boost_type || '');
      setItemBoostAmount(item.boost_amount || 0);
      setItemMaxDurability(item.max_durability || 0);
      // Parse sellable locations
      setItemSellableOnStreets(item.sellable_on_streets || false);
      setItemSellableAtDocks(item.sellable_at_docks || false);
      setEditingItem(item);
    } else {
      setItemFormData({
        name: '',
        description: '',
        type: 'consumable',
        icon: 'https://images.unsplash.com/photo-1606400082777-ef05f3c5cde9?w=400',
        rarity: 'common',
        tradeable: false,
        usable: true,
        effect: ''
      });
      setItemEffectType('');
      setItemEffectValue(0);
      setItemAddictionAmount(0);
      setItemResellPrice(0);
      setItemBoostType('');
      setItemBoostAmount(0);
      setItemMaxDurability(0);
      setItemSellableOnStreets(false);
      setItemSellableAtDocks(false);
      setEditingItem(null);
    }
    setShowItemModal(true);
  };

  const closeItemModal = () => {
    setShowItemModal(false);
    setEditingItem(null);
  };

  const saveItem = async () => {
    setError('');
    setSuccess('');

    if (!itemFormData.name || !itemFormData.icon) {
      setError('Item name and icon are required');
      return;
    }

    // Build effect JSON from form fields
    let effectJson = '';
    if (itemEffectType && itemEffectValue) {
      const effectObj = { type: itemEffectType, value: itemEffectValue };
      if (itemEffectType === 'stamina' && itemAddictionAmount > 0) {
        effectObj.addiction = itemAddictionAmount;
      }
      effectJson = JSON.stringify(effectObj);
    }

    const itemData = {
      ...itemFormData,
      effect: effectJson,
      resell_price: itemResellPrice || null,
      boost_type: itemBoostType || null,
      boost_amount: itemBoostAmount || 0,
      max_durability: itemMaxDurability || 0,
      sellable_on_streets: itemSellableOnStreets,
      sellable_at_docks: itemSellableAtDocks
    };

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('the_life_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
        setSuccess('Item updated successfully!');
      } else {
        const { error } = await supabase
          .from('the_life_items')
          .insert([itemData]);

        if (error) throw error;
        setSuccess('Item created successfully!');
      }

      closeItemModal();
      loadItems();
    } catch (err) {
      setError('Failed to save item: ' + err.message);
    }
  };

  const deleteItem = async (itemId) => {
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('the_life_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      setSuccess('Item deleted successfully!');
      loadItems();
    } catch (err) {
      setError('Failed to delete item: ' + err.message);
    }
  };

  // === MONHE STORE MANAGEMENT ===
  const openStoreModal = (storeItem = null) => {
    if (storeItem) {
      setStoreFormData({
        item_id: storeItem.item_id,
        category: storeItem.category,
        price: storeItem.price,
        stock_quantity: storeItem.stock_quantity,
        is_active: storeItem.is_active,
        display_order: storeItem.display_order,
        limited_time_until: storeItem.limited_time_until || ''
      });
      setEditingStoreItem(storeItem);
    } else {
      setStoreFormData({
        item_id: '',
        category: 'healing',
        price: 0,
        stock_quantity: null,
        is_active: true,
        display_order: 0,
        limited_time_until: ''
      });
      setEditingStoreItem(null);
    }
    setShowStoreModal(true);
  };

  const closeStoreModal = () => {
    setShowStoreModal(false);
    setEditingStoreItem(null);
  };

  const saveStoreItem = async () => {
    setError('');
    setSuccess('');

    if (!storeFormData.item_id || !storeFormData.price) {
      setError('Item and price are required');
      return;
    }

    const storeData = {
      ...storeFormData,
      stock_quantity: storeFormData.stock_quantity === '' ? null : storeFormData.stock_quantity,
      limited_time_until: storeFormData.limited_time_until || null
    };

    try {
      if (editingStoreItem) {
        const { error } = await supabase
          .from('the_life_store_items')
          .update(storeData)
          .eq('id', editingStoreItem.id);

        if (error) throw error;
        setSuccess('Store item updated successfully!');
      } else {
        const { error } = await supabase
          .from('the_life_store_items')
          .insert([storeData]);

        if (error) throw error;
        setSuccess('Store item added successfully!');
      }

      closeStoreModal();
      loadStoreItems();
    } catch (err) {
      setError('Failed to save store item: ' + err.message);
    }
  };

  const deleteStoreItem = async (storeItemId) => {
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('the_life_store_items')
        .delete()
        .eq('id', storeItemId);

      if (error) throw error;
      setSuccess('Store item removed successfully!');
      loadStoreItems();
    } catch (err) {
      setError('Failed to delete store item: ' + err.message);
    }
  };

  const toggleStoreItemActive = async (storeItem) => {
    try {
      const { error } = await supabase
        .from('the_life_store_items')
        .update({ is_active: !storeItem.is_active })
        .eq('id', storeItem.id);
      
      if (error) throw error;
      setSuccess(`Store item ${!storeItem.is_active ? 'activated' : 'deactivated'} successfully!`);
      loadStoreItems();
    } catch (err) {
      setError('Failed to toggle store item: ' + err.message);
    }
  };

  // === BROTHEL WORKERS MANAGEMENT ===
  
  const loadWorkers = async () => {
    const { data, error } = await supabase
      .from('the_life_brothel_workers')
      .select('*')
      .order('rarity', { ascending: true })
      .order('hire_cost', { ascending: true });
    
    if (error) {
      console.error('Error loading workers:', error);
    } else {
      setWorkers(data || []);
    }
  };

  const openWorkerModal = (worker = null) => {
    if (worker) {
      setWorkerFormData({
        name: worker.name,
        description: worker.description || '',
        image_url: worker.image_url || '',
        hire_cost: worker.hire_cost,
        income_per_hour: worker.income_per_hour,
        rarity: worker.rarity,
        min_level_required: worker.min_level_required,
        is_active: worker.is_active
      });
      setEditingWorker(worker);
    } else {
      setWorkerFormData({
        name: '',
        description: '',
        image_url: '',
        hire_cost: 1000,
        income_per_hour: 100,
        rarity: 'common',
        min_level_required: 1,
        is_active: true
      });
      setEditingWorker(null);
    }
    setShowWorkerModal(true);
  };

  const closeWorkerModal = () => {
    setShowWorkerModal(false);
    setEditingWorker(null);
  };

  const saveWorker = async () => {
    setError('');
    setSuccess('');

    if (!workerFormData.name) {
      setError('Worker name is required');
      return;
    }

    try {
      if (editingWorker) {
        const { error } = await supabase
          .from('the_life_brothel_workers')
          .update(workerFormData)
          .eq('id', editingWorker.id);

        if (error) throw error;
        setSuccess('Worker updated successfully!');
      } else {
        const { error } = await supabase
          .from('the_life_brothel_workers')
          .insert([workerFormData]);

        if (error) throw error;
        setSuccess('Worker created successfully!');
      }

      closeWorkerModal();
      loadWorkers();
    } catch (err) {
      setError('Failed to save worker: ' + err.message);
    }
  };

  const deleteWorker = async (workerId) => {
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('the_life_brothel_workers')
        .delete()
        .eq('id', workerId);

      if (error) throw error;
      setSuccess('Worker deleted successfully!');
      loadWorkers();
    } catch (err) {
      setError('Failed to delete worker: ' + err.message);
    }
  };

  const toggleWorkerActive = async (workerId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('the_life_brothel_workers')
        .update({ is_active: !currentStatus })
        .eq('id', workerId);

      if (error) throw error;
      loadWorkers();
    } catch (err) {
      setError('Failed to toggle worker status: ' + err.message);
    }
  };

  // === DOCK BOAT MANAGEMENT ===
  
  const loadBoats = async () => {
    const { data, error } = await supabase
      .from('the_life_dock_boats')
      .select(`
        *,
        item:the_life_items(name, icon)
      `)
      .order('arrival_time', { ascending: true });
    
    if (error) {
      console.error('Error loading boats:', error);
    } else {
      setBoats(data || []);
    }
  };

  const openBoatModal = (boat = null) => {
    if (boat) {
      setBoatFormData({
        name: boat.name,
        image_url: boat.image_url || '',
        item_id: boat.item_id || '',
        arrival_time: boat.arrival_time ? new Date(boat.arrival_time).toISOString().slice(0, 16) : '',
        departure_time: boat.departure_time ? new Date(boat.departure_time).toISOString().slice(0, 16) : '',
        max_shipments: boat.max_shipments || 100,
        is_active: boat.is_active ?? true
      });
      setEditingBoat(boat);
    } else {
      setBoatFormData({
        name: '',
        image_url: '',
        item_id: '',
        arrival_time: '',
        departure_time: '',
        max_shipments: 100,
        is_active: true
      });
      setEditingBoat(null);
    }
    setShowBoatModal(true);
  };

  const closeBoatModal = () => {
    setShowBoatModal(false);
    setEditingBoat(null);
  };

  const saveBoat = async () => {
    setError('');
    setSuccess('');

    if (!boatFormData.name || !boatFormData.item_id || !boatFormData.arrival_time || !boatFormData.departure_time) {
      setError('Boat name, item, arrival time, and departure time are required');
      return;
    }

    const boatData = {
      name: boatFormData.name,
      item_id: boatFormData.item_id,
      arrival_time: new Date(boatFormData.arrival_time).toISOString(),
      departure_time: new Date(boatFormData.departure_time).toISOString(),
      max_shipments: boatFormData.max_shipments || 100,
      current_shipments: editingBoat?.current_shipments || 0,
      is_active: boatFormData.is_active,
      image_url: boatFormData.image_url || null
    };

    try {
      if (editingBoat) {
        const { error } = await supabase
          .from('the_life_dock_boats')
          .update(boatData)
          .eq('id', editingBoat.id);

        if (error) throw error;
        setSuccess('Boat updated successfully!');
      } else {
        const { error } = await supabase
          .from('the_life_dock_boats')
          .insert([boatData]);

        if (error) throw error;
        setSuccess('Boat scheduled successfully!');
      }

      closeBoatModal();
      loadBoats();
    } catch (err) {
      setError('Failed to save boat: ' + err.message);
    }
  };

  const deleteBoat = async (boatId) => {
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('the_life_dock_boats')
        .delete()
        .eq('id', boatId);

      if (error) throw error;
      setSuccess('Boat deleted successfully!');
      loadBoats();
    } catch (err) {
      setError('Failed to delete boat: ' + err.message);
    }
  };

  const toggleBoatActive = async (boatId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('the_life_dock_boats')
        .update({ is_active: !currentStatus })
        .eq('id', boatId);

      if (error) throw error;
      loadBoats();
    } catch (err) {
      setError('Failed to toggle boat status: ' + err.message);
    }
  };

  // Reschedule a past boat with new times
  const rescheduleBoat = (boat) => {
    // Pre-fill form with boat data but reset times and shipments
    setBoatFormData({
      name: boat.name,
      image_url: boat.image_url || '',
      item_id: boat.item_id || '',
      arrival_time: '',
      departure_time: '',
      max_shipments: boat.max_shipments || 100,
      is_active: true
    });
    setEditingBoat(null); // This creates a NEW boat, not editing the old one
    setShowBoatModal(true);
  };

  const toggleOfferActive = async (offerId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('casino_offers')
        .update({ is_active: !currentStatus })
        .eq('id', offerId);

      if (error) throw error;
      loadOffers();
    } catch (err) {
      setError('Failed to toggle offer status: ' + err.message);
    }
  };

  // === EVENT MESSAGE MANAGEMENT ===
  
  const openEventMessageModal = (message = null) => {
    if (message) {
      setEventMessageFormData({
        event_type: message.event_type,
        message: message.message,
        image_url: message.image_url,
        is_active: message.is_active
      });
      setEditingEventMessage(message);
    } else {
      setEventMessageFormData({
        event_type: 'jail_crime',
        message: '',
        image_url: '',
        is_active: true
      });
      setEditingEventMessage(null);
    }
    setShowEventMessageModal(true);
  };

  const closeEventMessageModal = () => {
    setShowEventMessageModal(false);
    setEditingEventMessage(null);
    setEventMessageFormData({
      event_type: 'jail_crime',
      message: '',
      image_url: '',
      is_active: true
    });
  };

  const saveEventMessage = async () => {
    setError('');
    setSuccess('');

    if (!eventMessageFormData.message || !eventMessageFormData.image_url) {
      setError('Message and image URL are required');
      return;
    }

    try {
      if (editingEventMessage) {
        const { error } = await supabase
          .from('the_life_event_messages')
          .update(eventMessageFormData)
          .eq('id', editingEventMessage.id);

        if (error) throw error;
        setSuccess('Event message updated successfully!');
      } else {
        const { error } = await supabase
          .from('the_life_event_messages')
          .insert([eventMessageFormData]);

        if (error) throw error;
        setSuccess('Event message created successfully!');
      }

      closeEventMessageModal();
      loadEventMessages();
    } catch (err) {
      setError('Failed to save event message: ' + err.message);
    }
  };

  const deleteEventMessage = async (messageId) => {
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('the_life_event_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      setSuccess('Event message deleted successfully!');
      loadEventMessages();
    } catch (err) {
      setError('Failed to delete event message: ' + err.message);
    }
  };

  const toggleEventMessageActive = async (messageId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('the_life_event_messages')
        .update({ is_active: !currentStatus })
        .eq('id', messageId);

      if (error) throw error;
      loadEventMessages();
    } catch (err) {
      setError('Failed to toggle event message status: ' + err.message);
    }
  };

  // === CATEGORY INFO MANAGEMENT ===

  const loadCategoryInfo = async () => {
    const { data, error } = await supabase
      .from('the_life_category_info')
      .select('*')
      .order('category_key', { ascending: true });
    
    if (error) {
      console.error('Error loading category info:', error);
    } else {
      setCategoryInfoList(data || []);
    }
  };

  const openCategoryModal = (category = null) => {
    if (category) {
      setCategoryFormData({
        category_key: category.category_key,
        category_name: category.category_name,
        description: category.description,
        image_url: category.image_url
      });
      setEditingCategory(category);
    } else {
      setCategoryFormData({
        category_key: '',
        category_name: '',
        description: '',
        image_url: ''
      });
      setEditingCategory(null);
    }
    setShowCategoryModal(true);
  };

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
  };

  const saveCategory = async () => {
    setError('');
    setSuccess('');

    if (!categoryFormData.category_key || !categoryFormData.category_name || !categoryFormData.description) {
      setError('Category key, name, and description are required');
      return;
    }

    try{
      if (editingCategory) {
        const { error } = await supabase
          .from('the_life_category_info')
          .update({
            category_name: categoryFormData.category_name,
            description: categoryFormData.description,
            image_url: categoryFormData.image_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        setSuccess('Category info updated successfully!');
      } else {
        const { error } = await supabase
          .from('the_life_category_info')
          .insert([categoryFormData]);

        if (error) throw error;
        setSuccess('Category info created successfully!');
      }

      closeCategoryModal();
      loadCategoryInfo();
    } catch (err) {
      setError('Failed to save category info: ' + err.message);
    }
  };

  const deleteCategory = async (categoryId) => {
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('the_life_category_info')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      setSuccess('Category info deleted successfully!');
      loadCategoryInfo();
    } catch (err) {
      setError('Failed to delete category info: ' + err.message);
    }
  };

  const handleCategoryImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      return;
    }

    setUploadingCategoryImage(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `thelife/categories/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(filePath);

      setCategoryFormData({...categoryFormData, image_url: publicUrl});
      setSuccess('Image uploaded successfully!');
    } catch (err) {
      setError('Failed to upload image: ' + err.message);
    } finally {
      setUploadingCategoryImage(false);
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
        se_points: parseInt(prizeFormData.se_points) || 0,
        probability: parseInt(prizeFormData.probability) || 1,
        display_order: parseInt(prizeFormData.display_order) || 0
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
      // Supabase has a 1000 row default limit, so we need to paginate
      let allSlots = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('slots')
          .select('*')
          .order('name', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allSlots = [...allSlots, ...data];
          page++;
          hasMore = data.length === pageSize; // If we got full page, there might be more
        } else {
          hasMore = false;
        }
      }

      console.log(`Loaded ${allSlots.length} slots from catalog`);
      setSlotCatalog(allSlots);
    } catch (err) {
      console.error('Error loading slot catalog:', err);
    }
  };

  const loadGuessBalanceSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('guess_balance_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGuessBalanceSessions(data || []);
    } catch (err) {
      console.error('Error loading guess balance sessions:', err);
    }
  };

  const loadGuessBalanceSlots = async (sessionId) => {
    try {
      const { data, error } = await supabase
        .from('guess_balance_slots')
        .select('*')
        .eq('session_id', sessionId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setGuessBalanceSlots(data || []);
    } catch (err) {
      console.error('Error loading slots:', err);
    }
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
      const sessionData = {
        title: guessSessionFormData.title,
        description: guessSessionFormData.description,
        start_value: parseFloat(guessSessionFormData.start_value) || 0,
        amount_expended: parseFloat(guessSessionFormData.amount_expended) || 0,
        be_multiplier: parseFloat(guessSessionFormData.be_multiplier) || 1.0,
        final_balance: guessSessionFormData.final_balance ? parseFloat(guessSessionFormData.final_balance) : null,
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
          bet_value: parseFloat(slot.bet_value) || 0,
          is_super: slot.is_super || false,
          bonus_win: slot.bonus_win ? parseFloat(slot.bonus_win) : null,
          multiplier: slot.multiplier ? parseFloat(slot.multiplier) : null,
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
        bet_value: parseFloat(slotFormData.bet_value) || 0,
        is_super: slotFormData.is_super,
        bonus_win: slotFormData.bonus_win ? parseFloat(slotFormData.bonus_win) : null,
        multiplier: slotFormData.multiplier ? parseFloat(slotFormData.multiplier) : null,
        display_order: parseInt(slotFormData.display_order) || 0
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
        .reduce((sum, s) => sum + (parseFloat(s.bet_value) || 0), 0);
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
    if (!slot || !slot.id) return;
    
    try {
      const { error } = await supabase
        .from('guess_balance_slots')
        .update({
          bonus_win: slot.bonus_win ? parseFloat(slot.bonus_win) : null,
          multiplier: slot.multiplier ? parseFloat(slot.multiplier) : null
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

  // === WIPE SETTINGS MANAGEMENT ===

  const loadWipeSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('the_life_wipe_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setWipeSettings({
          id: data.id,
          wipe_inventory: data.wipe_inventory || false,
          wipe_cash: data.wipe_cash || false,
          wipe_bank: data.wipe_bank || false,
          wipe_level: data.wipe_level || false,
          wipe_skills: data.wipe_skills || false,
          wipe_businesses: data.wipe_businesses || false,
          wipe_upgrades: data.wipe_upgrades || false,
          wipe_brothel_workers: data.wipe_brothel_workers || false,
          wipe_stocks: data.wipe_stocks || false,
          wipe_addiction: data.wipe_addiction || false,
          wipe_health_stamina: data.wipe_health_stamina || false,
          wipe_jail_hospital: data.wipe_jail_hospital || false,
          wipe_pvp_stats: data.wipe_pvp_stats || false,
          wipe_casino_history: data.wipe_casino_history || false,
          wipe_dock_shipments: data.wipe_dock_shipments || false,
          wipe_game_leaderboard: data.wipe_game_leaderboard || false,
          wipe_player_progress: data.wipe_player_progress || false,
          scheduled_at: data.scheduled_at ? new Date(data.scheduled_at).toISOString().slice(0, 16) : '',
          is_active: data.is_active || false,
          is_recurring: data.is_recurring || false,
          recurrence_months: data.recurrence_months || 3,
          last_executed_at: data.last_executed_at
        });
      }
    } catch (err) {
      console.error('Error loading wipe settings:', err);
    }
  };

  const saveWipeSettings = async () => {
    setWipeSaving(true);
    setError('');
    setSuccess('');

    try {
      const updateData = {
        wipe_inventory: wipeSettings.wipe_inventory,
        wipe_cash: wipeSettings.wipe_cash,
        wipe_bank: wipeSettings.wipe_bank,
        wipe_level: wipeSettings.wipe_level,
        wipe_skills: wipeSettings.wipe_skills,
        wipe_businesses: wipeSettings.wipe_businesses,
        wipe_upgrades: wipeSettings.wipe_upgrades,
        wipe_brothel_workers: wipeSettings.wipe_brothel_workers,
        wipe_stocks: wipeSettings.wipe_stocks,
        wipe_addiction: wipeSettings.wipe_addiction,
        wipe_health_stamina: wipeSettings.wipe_health_stamina,
        wipe_jail_hospital: wipeSettings.wipe_jail_hospital,
        wipe_pvp_stats: wipeSettings.wipe_pvp_stats,
        wipe_casino_history: wipeSettings.wipe_casino_history,
        wipe_dock_shipments: wipeSettings.wipe_dock_shipments,
        wipe_game_leaderboard: wipeSettings.wipe_game_leaderboard,
        wipe_player_progress: wipeSettings.wipe_player_progress,
        scheduled_at: wipeSettings.scheduled_at ? new Date(wipeSettings.scheduled_at).toISOString() : null,
        is_active: wipeSettings.is_active,
        is_recurring: wipeSettings.is_recurring,
        recurrence_months: wipeSettings.recurrence_months,
        updated_at: new Date().toISOString()
      };

      if (wipeSettings.id) {
        // Update existing
        const { error } = await supabase
          .from('the_life_wipe_settings')
          .update(updateData)
          .eq('id', wipeSettings.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('the_life_wipe_settings')
          .insert(updateData);

        if (error) throw error;
      }

      setSuccess('Wipe settings saved successfully!');
      loadWipeSettings();
    } catch (err) {
      setError('Failed to save wipe settings: ' + err.message);
    } finally {
      setWipeSaving(false);
    }
  };

  const executeWipeNow = async () => {
    setWipeSaving(true);
    setError('');
    setSuccess('');

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call the server-side API to execute wipe (bypasses RLS)
      const response = await fetch('/api/thelife-wipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ wipeSettings })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Wipe failed');
      }

      // Update last executed time
      if (wipeSettings.id) {
        await supabase
          .from('the_life_wipe_settings')
          .update({ 
            last_executed_at: new Date().toISOString(),
            is_active: false 
          })
          .eq('id', wipeSettings.id);
      }

      setSuccess('🔥 Wipe executed successfully! Selected player data has been reset.');
      loadWipeSettings();
    } catch (err) {
      setError('Failed to execute wipe: ' + err.message);
    } finally {
      setWipeSaving(false);
    }
  };

  // Only show brief loading for admin permission check, not data loading
  if (adminLoading) {
    return null; // Show nothing while checking admin status
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="admin-panel admin-panel-modern">
      <div className="admin-header">
        <h1>🛡️ Admin Panel</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Modern Tab Navigation */}
      <TabNavigation
        tabs={[
          { id: 'users', label: 'User Management', icon: '👥' },
          { id: 'offers', label: 'Casino Offers', icon: '🎰' },
          { id: 'thelife', label: 'The Life', icon: '🔫' },
          { id: 'wheel', label: 'Daily Wheel', icon: '🎡' },
          { id: 'wipe', label: 'Server Wipe', icon: '💀' },
          { id: 'seasonpass', label: 'Season Pass', icon: '👑' },
          { id: 'guessbalance', label: 'Guess Balance', icon: '💰' },
        ]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <>
          <StatsGrid columns={6}>
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
              icon="⚔️" 
              value={users.filter(u => u.roles?.some(r => r.role === 'moderator')).length} 
              label="Moderators" 
              color="info"
            />
            <StatsCard 
              icon="👑" 
              value={users.filter(u => u.roles?.some(r => r.role === 'premium')).length} 
              label="Premium" 
              color="warning"
            />
            <StatsCard 
              icon="✓" 
              value={users.filter(u => u.is_active).length} 
              label="Active Users" 
              color="success"
            />
          </StatsGrid>

          {/* User Management Table */}
          <div className="user-management-section">
            {/* Search and Actions Bar */}
            <div className="user-table-header">
              <div className="user-search-bar">
                <input
                  type="text"
                  placeholder="🔍 Search users by email, provider, or role..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="user-search-input"
                />
                {userSearch && (
                  <button 
                    className="clear-search-btn"
                    onClick={() => setUserSearch('')}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Users Table */}
            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>User</th>
                    <th style={{ width: '15%' }}>Provider</th>
                    <th style={{ width: '30%' }}>Roles</th>
                    <th style={{ width: '10%' }}>Status</th>
                    <th style={{ width: '15%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter(user => {
                      if (!userSearch) return true;
                      const search = userSearch.toLowerCase();
                      return (
                        user.email?.toLowerCase().includes(search) ||
                        user.provider?.toLowerCase().includes(search) ||
                        user.provider_username?.toLowerCase().includes(search) ||
                        user.roles?.some(r => r.role.toLowerCase().includes(search))
                      );
                    })
                    .slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage)
                    .map(user => (
                      <tr 
                        key={user.id} 
                        className={`user-table-row ${selectedUserId === user.id ? 'selected' : ''} ${!user.is_active ? 'inactive' : ''}`}
                      >
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar">{user.email?.[0]?.toUpperCase() || '?'}</div>
                            <div className="user-info">
                              <div className="user-email">{user.email}</div>
                              {user.provider_username && (
                                <div className="user-username">@{user.provider_username}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`provider-badge provider-${user.provider?.toLowerCase()}`}>
                            {user.provider || 'Email'}
                          </span>
                        </td>
                        <td>
                          <div className="roles-cell">
                            {user.roles?.map((roleObj, idx) => (
                              <span key={idx} className={`role-badge-table role-${roleObj.role}`}>
                                {roleObj.role}
                              </span>
                            ))}
                            {(!user.roles || user.roles.length === 0) && (
                              <span className="no-roles">No roles</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                            {user.is_active ? '✓ Active' : '✗ Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="actions-cell">
                            <button 
                              className="btn-table-action btn-edit"
                              onClick={() => {
                                setSelectedUserId(user.id);
                                openEditModal(user);
                              }}
                              title="Edit User"
                            >
                              ✏️ Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {users.filter(user => {
              if (!userSearch) return true;
              const search = userSearch.toLowerCase();
              return (
                user.email?.toLowerCase().includes(search) ||
                user.provider?.toLowerCase().includes(search) ||
                user.roles?.some(r => r.role.toLowerCase().includes(search))
              );
            }).length > usersPerPage && (
              <div className="table-pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  ← Previous
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {Math.ceil(users.filter(u => !userSearch || u.email?.toLowerCase().includes(userSearch.toLowerCase())).length / usersPerPage)}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={currentPage >= Math.ceil(users.length / usersPerPage)}
                  className="pagination-btn"
                >
                  Next →
                </button>
              </div>
            )}
          </div>

          {/* Edit User Side Panel */}
          <SidePanel
            isOpen={!!selectedUserId && !!editingUser}
            onClose={() => {
              setSelectedUserId(null);
              setEditingUser(null);
            }}
            title={editingUser?.email || 'Edit User'}
            width="500px"
          >
            {editingUser && (
              <div className="user-edit-panel">
                <div className="user-edit-header">
                  <div className="user-edit-avatar">{editingUser.email?.[0]?.toUpperCase() || '?'}</div>
                  <div className="user-edit-info">
                    <h3>{editingUser.email}</h3>
                    <span className={`provider-badge provider-${editingUser.provider?.toLowerCase()}`}>
                      {editingUser.provider || 'Email'}
                      {editingUser.provider_username && ` (@${editingUser.provider_username})`}
                    </span>
                  </div>
                </div>

                <div className="user-edit-section">
                  <h4>📋 User Details</h4>
                  <div className="user-details-grid">
                    <div className="detail-item">
                      <label>Status</label>
                      <span className={`status-badge ${editingUser.is_active ? 'active' : 'inactive'}`}>
                        {editingUser.is_active ? '✓ Active' : '✗ Inactive'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Created</label>
                      <span>{new Date(editingUser.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="user-edit-section">
                  <h4>🎭 Current Roles</h4>
                  <div className="current-roles-list">
                    {(editingUser.roles || []).map((roleObj, idx) => (
                      <div key={idx} className="role-item">
                        <div className="role-item-info">
                          <span className={`role-badge role-${roleObj.role}`}>
                            {roleObj.role}
                          </span>
                          {roleObj.access_expires_at && (
                            <span className="role-expiry">
                              Expires: {new Date(roleObj.access_expires_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <button 
                          className="btn-remove-role"
                          onClick={() => handleRemoveRole(roleObj.role)}
                          title="Remove Role"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {(!editingUser.roles || editingUser.roles.length === 0) && (
                      <div className="no-roles-message">No roles assigned</div>
                    )}
                  </div>
                </div>

                <div className="user-edit-section">
                  <h4>➕ Add New Role</h4>
                  <div className="add-role-form-panel">
                    <select 
                      value={editingUser.newRole || ''}
                      onChange={(e) => setEditingUser({...editingUser, newRole: e.target.value, newRoleModeratorPermissions: {}})}
                      className="role-select-panel"
                    >
                      <option value="">-- Select Role --</option>
                      <option value="user">👤 User (No Overlay Access)</option>
                      <option value="premium">👑 Premium (Overlay Only)</option>
                      <option value="slot_modder">🎰 Slot Modder (Slot Management)</option>
                      <option value="moderator">⚔️ Moderator (Overlay + Custom Admin)</option>
                      <option value="admin">🛡️ Admin (Full Access)</option>
                    </select>

                    {editingUser.newRole === 'moderator' && (
                      <div className="moderator-permissions-panel">
                        <label className="permissions-label">Moderator Permissions:</label>
                        <div className="permissions-grid">
                          {Object.entries(MODERATOR_PERMISSIONS).map(([key, description]) => (
                            <label key={key} className="permission-checkbox">
                              <input
                                type="checkbox"
                                checked={!!editingUser.newRoleModeratorPermissions?.[key]}
                                onChange={() => toggleModeratorPermission(key)}
                              />
                              <span>{key.replace(/_/g, ' ')}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {editingUser.newRole && (
                      <div className="role-expiry-row">
                        <input 
                          type="number" 
                          placeholder="Days until expiry (empty = never)"
                          value={editingUser.newRoleExpiryDays || ''}
                          onChange={(e) => setEditingUser({...editingUser, newRoleExpiryDays: e.target.value})}
                          min="0"
                          className="expiry-input-panel"
                        />
                        <button onClick={handleAddRole} className="btn-add-role">
                          ➕ Add Role
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="user-edit-section danger-zone">
                  <h4>⚠️ Danger Zone</h4>
                  <div className="danger-actions">
                    <button 
                      className="btn-danger-action btn-revoke"
                      onClick={() => handleRevokeAccess(editingUser.id)}
                      disabled={!editingUser.is_active}
                    >
                      🚫 Revoke Access
                    </button>
                    <button 
                      className="btn-danger-action btn-delete"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to DELETE this user? This cannot be undone!')) {
                          handleDeleteUser(editingUser.id);
                          setSelectedUserId(null);
                          setEditingUser(null);
                        }
                      }}
                    >
                      🗑️ Delete User
                    </button>
                  </div>
                </div>
              </div>
            )}
          </SidePanel>
        </>
      )}

      {/* Casino Offers Tab */}
      {activeTab === 'offers' && (
        <div className="offers-management">
          <div className="offers-header">
            <h2>Casino Offer Cards</h2>
            <div className="offers-header-actions">
              <div className="offer-search-bar">
                <input
                  type="text"
                  placeholder="Search by casino name, title, or badge..."
                  value={offerSearch}
                  onChange={(e) => setOfferSearch(e.target.value)}
                />
              </div>
              <button onClick={() => openOfferModal()} className="btn-create-offer">
                ➕ Create New Offer
              </button>
            </div>
          </div>

          <div className="offers-grid">
            {offers
              .filter(offer => {
                if (!offerSearch.trim()) return true;
                const search = offerSearch.toLowerCase();
                return (
                  offer.casino_name?.toLowerCase().includes(search) ||
                  offer.title?.toLowerCase().includes(search) ||
                  offer.badge?.toLowerCase().includes(search) ||
                  offer.bonus_value?.toLowerCase().includes(search)
                );
              })
              .map((offer) => (
              <div key={offer.id} className={`offer-admin-card ${!offer.is_active ? 'inactive' : ''}`}>
                <div className="offer-admin-image">
                  <img src={offer.image_url} alt={offer.casino_name} />
                  {offer.badge && (
                    <span className={`offer-badge ${offer.badge_class}`}>{offer.badge}</span>
                  )}
                  {!offer.is_active && (
                    <div className="inactive-overlay">INACTIVE</div>
                  )}
                </div>
                <div className="offer-admin-content">
                  <h3>{offer.casino_name}</h3>
                  <p className="offer-title">{offer.title}</p>
                  <div className="offer-stats">
                    <span>💰 {offer.min_deposit}</span>
                    <span>💸 {offer.cashback}</span>
                    <span>🎁 {offer.bonus_value}</span>
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
                      {offer.is_active ? '👁️ Active' : '🚫 Inactive'}
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
              <p>No casino offers yet. Create your first offer!</p>
            </div>
          )}
        </div>
      )}

      {/* Casino Offer Modal - New Isolated Component */}
      <CasinoOfferModal
        isOpen={showOfferModal}
        onClose={closeOfferModal}
        onSave={async (formData) => {
          try {
            if (editingOffer) {
              await supabase
                .from('casino_offers')
                .update(formData)
                .eq('id', editingOffer.id);
            } else {
              await supabase
                .from('casino_offers')
                .insert([{ ...formData, created_by: (await supabase.auth.getUser()).data.user?.id }]);
            }
            closeOfferModal();
            loadOffers();
            setSuccess(editingOffer ? 'Offer updated successfully!' : 'Offer created successfully!');
          } catch (err) {
            setError('Failed to save offer: ' + err.message);
          }
        }}
        onDelete={async (offerId) => {
          await supabase.from('casino_offers').delete().eq('id', offerId);
          closeOfferModal();
          loadOffers();
          setSuccess('Offer deleted successfully!');
        }}
        editingOffer={editingOffer}
        saving={loading}
      />

      {/* The Life Management Tab */}
      {activeTab === 'thelife' && (
        <>
          <div className="thelife-management">
            <div className="thelife-header">
              <h2>🔫 The Life Game Management</h2>
              <p>Manage crimes, businesses, items, and brothel content for The Life RPG</p>
            </div>

            {/* Sub-tabs for The Life */}
            <div className="thelife-tabs">
              <button 
                className={`thelife-tab ${theLifeTab === 'crimes' ? 'active' : ''}`}
                onClick={() => setTheLifeTab('crimes')}
              >
                💰 Crimes
              </button>
              <button 
                className={`thelife-tab ${theLifeTab === 'businesses' ? 'active' : ''}`}
                onClick={() => setTheLifeTab('businesses')}
              >
                💼 Businesses
              </button>
              <button 
                className={`thelife-tab ${theLifeTab === 'items' ? 'active' : ''}`}
                onClick={() => setTheLifeTab('items')}
              >
                🎒 Items
              </button>
              <button 
                className={`thelife-tab ${theLifeTab === 'store' ? 'active' : ''}`}
                onClick={() => setTheLifeTab('store')}
              >
                🏪 Monhe Store
              </button>
              <button 
                className={`thelife-tab ${theLifeTab === 'workers' ? 'active' : ''}`}
                onClick={() => setTheLifeTab('workers')}
              >
                💃 Brothel Workers
              </button>
              <button 
                className={`thelife-tab ${theLifeTab === 'boats' ? 'active' : ''}`}
                onClick={() => setTheLifeTab('boats')}
              >
                ⚓ Dock Boats
              </button>
              <button 
                className={`thelife-tab ${theLifeTab === 'messages' ? 'active' : ''}`}
                onClick={() => setTheLifeTab('messages')}
              >
                📸 Event Messages
              </button>
              <button 
                className={`thelife-tab ${theLifeTab === 'categories' ? 'active' : ''}`}
                onClick={() => setTheLifeTab('categories')}
              >
                📚 Category Info
              </button>
            </div>

            {/* Crimes Section */}
            {theLifeTab === 'crimes' && (
              <div className="crimes-management">
                <div className="section-header">
                  <h3>💰 Crime Management</h3>
                  <button onClick={() => openCrimeModal()} className="btn-primary">
                    ➕ Add New Crime
                  </button>
                </div>

                <div className="scroll-container-wrapper">
                  <button 
                    className="scroll-arrow scroll-arrow-left" 
                    onClick={() => scrollCrimes('left')}
                    aria-label="Scroll left"
                  >
                    ←
                  </button>
                  <div className="crimes-grid-scroll" ref={crimesScrollRef}>
                  {crimes.map(crime => (
                    <div key={crime.id} className="crime-admin-card">
                      <div className="crime-preview-image">
                        {crime.image_url ? (
                          <img src={crime.image_url} alt={crime.name} />
                        ) : (
                          <div className="no-image">No Image</div>
                        )}
                        {!crime.is_active && (
                          <div className="inactive-badge">INACTIVE</div>
                        )}
                      </div>
                      <div className="crime-info">
                        <h4>{crime.name}</h4>
                        <p className="crime-desc">{crime.description}</p>
                        <div className="crime-stats-grid">
                          <div className="stat">
                            <span className="label">Level</span>
                            <span className="value">{crime.min_level_required}</span>
                          </div>
                          <div className="stat">
                            <span className="label">Stamina</span>
                            <span className="value">{crime.stamina_cost || crime.ticket_cost}</span>
                          </div>
                          <div className="stat">
                            <span className="label">Base Success</span>
                            <span className="value">{crime.success_rate}%</span>
                          </div>
                          <div className="stat">
                            <span className="label">Reward</span>
                            <span className="value">${crime.base_reward}-${crime.max_reward}</span>
                          </div>
                          <div className="stat">
                            <span className="label">XP</span>
                            <span className="value">{crime.xp_reward}</span>
                          </div>
                          <div className="stat">
                            <span className="label">Base Jail</span>
                            <span className="value">{crime.jail_time_minutes}m</span>
                          </div>
                        </div>
                        <div style={{
                          marginTop: '10px', 
                          padding: '8px', 
                          background: 'rgba(212, 175, 55, 0.1)', 
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          color: '#d4af37'
                        }}>
                          <div style={{fontWeight: '600', marginBottom: '4px'}}>📊 Dynamic Success Rates:</div>
                          <div style={{fontSize: '0.8rem', color: '#cbd5e0'}}>
                            Lv{Math.max(1, crime.min_level_required - 2)}: {Math.max(5, crime.success_rate - 20)}% | 
                            Lv{crime.min_level_required}: {crime.success_rate}% | 
                            Lv{crime.min_level_required + 2}: {Math.min(95, crime.success_rate + 10)}%
                          </div>
                        </div>
                      </div>
                      <div className="crime-actions">
                        <button 
                          onClick={() => toggleCrimeActive(crime)} 
                          className={`btn-toggle ${crime.is_active ? 'active' : 'inactive'}`}
                        >
                          {crime.is_active ? '✓ Active' : '✗ Inactive'}
                        </button>
                        <button onClick={() => openCrimeModal(crime)} className="btn-edit">
                          ✏️ Edit
                        </button>
                        <ConfirmButton
                          onConfirm={() => deleteCrime(crime.id)}
                          confirmText="Delete?"
                          className="btn-delete"
                          variant="danger"
                        >
                          🗑️ Delete
                        </ConfirmButton>
                      </div>
                    </div>
                  ))}
                  </div>
                  <button 
                    className="scroll-arrow scroll-arrow-right" 
                    onClick={() => scrollCrimes('right')}
                    aria-label="Scroll right"
                  >
                    →
                  </button>
                </div>
              </div>
            )}

            {/* Businesses Section */}
            {theLifeTab === 'businesses' && (
              <div className="businesses-management">
                <div className="section-header">
                  <h3>💼 Business Management</h3>
                  <button onClick={() => openBusinessModal()} className="btn-primary">
                    ➕ Add New Business
                  </button>
                </div>

                <div className="scroll-container-wrapper">
                  <button 
                    className="scroll-arrow scroll-arrow-left" 
                    onClick={() => scrollBusinesses('left')}
                    aria-label="Scroll left"
                  >
                    ←
                  </button>
                  <div className="businesses-grid-scroll" ref={businessesScrollRef}>
                    {businesses.map(business => (
                    <div key={business.id} className="business-admin-card">
                      <div className="business-preview-image">
                        {business.image_url ? (
                          <img src={business.image_url} alt={business.name} />
                        ) : (
                          <div className="no-image">No Image</div>
                        )}
                        {!business.is_active && (
                          <div className="inactive-badge">INACTIVE</div>
                        )}
                      </div>
                      <div className="business-info">
                        <h4>{business.name}</h4>
                        <p className="business-desc">{business.description}</p>
                        <div className="business-stats-grid">
                          <div className="stat">
                            <span className="label">Purchase</span>
                            <span className="value">${business.purchase_price?.toLocaleString() || business.cost?.toLocaleString()}</span>
                          </div>
                          <div className="stat">
                            <span className="label">Production</span>
                            <span className="value">${business.production_cost?.toLocaleString() || business.cost?.toLocaleString()}</span>
                          </div>
                          <div className="stat">
                            <span className="label">Reward</span>
                            <span className="value">
                              {business.reward_type === 'items' && business.reward_item_id ? 
                                `${business.reward_item_quantity || 1}x Items` : 
                                `$${business.profit?.toLocaleString() || '0'}`}
                            </span>
                          </div>
                          <div className="stat">
                            <span className="label">Duration</span>
                            <span className="value">{business.duration_minutes}m</span>
                          </div>
                          <div className="stat">
                            <span className="label">Min Level</span>
                            <span className="value">{business.min_level_required}</span>
                          </div>
                        </div>
                      </div>
                      <div className="business-actions">
                        <button 
                          onClick={() => toggleBusinessActive(business)} 
                          className={`btn-toggle ${business.is_active ? 'active' : 'inactive'}`}
                        >
                          {business.is_active ? '✓ Active' : '✗ Inactive'}
                        </button>
                        <button onClick={() => openBusinessModal(business)} className="btn-edit">
                          ✏️ Edit
                        </button>
                        <ConfirmButton
                          onConfirm={() => deleteBusiness(business.id)}
                          confirmText="Delete?"
                          className="btn-delete"
                          variant="danger"
                        >
                          🗑️ Delete
                        </ConfirmButton>
                      </div>
                    </div>
                  ))}
                  </div>
                  <button 
                    className="scroll-arrow scroll-arrow-right" 
                    onClick={() => scrollBusinesses('right')}
                    aria-label="Scroll right"
                  >
                    →
                  </button>
                </div>
              </div>
            )}

            {/* Items Section */}
            {theLifeTab === 'items' && (
              <div className="items-management">
                <div className="section-header">
                  <h3>🎒 Item Management</h3>
                  <button onClick={() => openItemModal()} className="btn-primary">
                    ➕ Add New Item
                  </button>
                </div>

                {/* Filter Controls */}
                <div className="admin-filters">
                  <div className="filter-group">
                    <label>Type:</label>
                    <select value={itemFilterType} onChange={(e) => setItemFilterType(e.target.value)}>
                      <option value="all">All Types</option>
                      <option value="consumable">Consumable</option>
                      <option value="equipment">Equipment</option>
                      <option value="special">Special</option>
                      <option value="collectible">Collectible</option>
                      <option value="business_reward">Business Reward</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Rarity:</label>
                    <select value={itemFilterRarity} onChange={(e) => setItemFilterRarity(e.target.value)}>
                      <option value="all">All Rarities</option>
                      <option value="common">Common</option>
                      <option value="rare">Rare</option>
                      <option value="epic">Epic</option>
                      <option value="legendary">Legendary</option>
                    </select>
                  </div>

                  <div className="filter-count">
                    Showing {items.filter(item => {
                      const typeMatch = itemFilterType === 'all' || item.type === itemFilterType;
                      const rarityMatch = itemFilterRarity === 'all' || item.rarity === itemFilterRarity;
                      return typeMatch && rarityMatch;
                    }).length} of {items.length} items
                  </div>
                </div>

                <div className="scroll-container-wrapper">
                  <button 
                    className="scroll-arrow scroll-arrow-left" 
                    onClick={() => scrollItems('left')}
                    aria-label="Scroll left"
                  >
                    ←
                  </button>
                  <div className="items-grid-scroll" ref={itemsScrollRef}>
                  {items.filter(item => {
                    const typeMatch = itemFilterType === 'all' || item.type === itemFilterType;
                    const rarityMatch = itemFilterRarity === 'all' || item.rarity === itemFilterRarity;
                    return typeMatch && rarityMatch;
                  }).map(item => (
                    <div key={item.id} className="item-admin-card">
                      <div className="item-image-preview">
                        <img src={item.icon} alt={item.name} style={{width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px'}} />
                      </div>
                      <div className="item-info">
                        <h4>{item.name}</h4>
                        <p className="item-desc">{item.description}</p>
                        <div className="item-meta">
                          <span className={`item-type ${item.type}`}>{item.type}</span>
                          <span className={`item-rarity ${item.rarity}`}>{item.rarity}</span>
                          {item.tradeable && <span className="item-tradeable">Tradeable</span>}
                        </div>
                      </div>
                      <div className="item-actions">
                        <button onClick={() => openItemModal(item)} className="btn-edit">
                          ✏️ Edit
                        </button>
                        <ConfirmButton
                          onConfirm={() => deleteItem(item.id)}
                          confirmText="Delete?"
                          className="btn-delete"
                          variant="danger"
                        >
                          🗑️ Delete
                        </ConfirmButton>
                      </div>
                    </div>
                  ))}
                  </div>
                  <button 
                    className="scroll-arrow scroll-arrow-right" 
                    onClick={() => scrollItems('right')}
                    aria-label="Scroll right"
                  >
                    →
                  </button>
                </div>
              </div>
            )}

            {/* Monhe Store Section */}
            {theLifeTab === 'store' && (
              <div className="store-management">
                <div className="section-header">
                  <h3>🏪 Monhe Store Management</h3>
                  <button onClick={() => openStoreModal()} className="btn-primary">
                    ➕ Add Store Item
                  </button>
                </div>

                <div className="store-items-list">
                  {storeItems.length === 0 ? (
                    <p className="no-data">No items in store. Add items from your inventory.</p>
                  ) : (
                    <div className="scroll-container-wrapper">
                      <button 
                        className="scroll-arrow scroll-arrow-left" 
                        onClick={() => scrollStoreItems('left')}
                        aria-label="Scroll left"
                      >
                        ←
                      </button>
                      <div className="store-items-grid-scroll" ref={storeScrollRef}>
                        {storeItems.map(storeItem => (
                          <div key={storeItem.id} className="store-item-card">
                            <div className="store-item-image">
                              <img src={storeItem.item.icon} alt={storeItem.item.name} />
                              {!storeItem.is_active && (
                                <div className="inactive-badge">INACTIVE</div>
                              )}
                            </div>
                            <div className="store-item-info">
                              <h4>{storeItem.item.name}</h4>
                              <span className={`category-badge ${storeItem.category}`}>
                                {storeItem.category === 'weapons' && '⚔️'}
                                {storeItem.category === 'gear' && '🛡️'}
                                {storeItem.category === 'healing' && '💊'}
                                {storeItem.category === 'valuable' && '💎'}
                                {storeItem.category === 'limited_time' && '⏰'}
                                {' '}{storeItem.category}
                              </span>
                              <div className="store-item-stats">
                                <div className="stat">
                                  <span className="label">Price</span>
                                  <span className="value">${storeItem.price.toLocaleString()}</span>
                                </div>
                                {storeItem.stock_quantity !== null && (
                                  <div className="stat">
                                    <span className="label">Stock</span>
                                    <span className="value">{storeItem.stock_quantity}</span>
                                  </div>
                                )}
                                <div className="stat">
                                  <span className="label">Order</span>
                                  <span className="value">{storeItem.display_order}</span>
                                </div>
                                {storeItem.limited_time_until && (
                                  <div className="stat">
                                    <span className="label">Until</span>
                                    <span className="value">{new Date(storeItem.limited_time_until).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                              <div className="store-item-actions">
                                <button 
                                  onClick={() => toggleStoreItemActive(storeItem)} 
                                  className={`btn-toggle ${storeItem.is_active ? 'active' : 'inactive'}`}
                                >
                                  {storeItem.is_active ? '✓' : '✗'}
                                </button>
                                <button onClick={() => openStoreModal(storeItem)} className="btn-edit">
                                  ✏️
                                </button>
                                <ConfirmButton
                                  onConfirm={() => deleteStoreItem(storeItem.id)}
                                  confirmText="Delete?"
                                  className="btn-delete"
                                  variant="danger"
                                >
                                  🗑️
                                </ConfirmButton>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button 
                        className="scroll-arrow scroll-arrow-right" 
                        onClick={() => scrollStoreItems('right')}
                        aria-label="Scroll right"
                      >
                        →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Brothel Workers Section */}
            {theLifeTab === 'workers' && (
              <div className="workers-management">
                <div className="section-header">
                  <h3>💃 Brothel Workers Management</h3>
                  <button onClick={() => openWorkerModal()} className="btn-primary">
                    ➕ Add New Worker
                  </button>
                </div>

                <div className="scroll-container-wrapper">
                  <button 
                    className="scroll-arrow scroll-arrow-left" 
                    onClick={() => scrollWorkers('left')}
                    aria-label="Scroll left"
                  >
                    ←
                  </button>
                  <div className="workers-grid-scroll" ref={workersScrollRef}>
                  {workers.map(worker => (
                    <div key={worker.id} className="worker-admin-card">
                      <div className="worker-preview-image">
                        {worker.image_url ? (
                          <img src={worker.image_url} alt={worker.name} />
                        ) : (
                          <div className="no-image">No Image</div>
                        )}
                        {!worker.is_active && (
                          <div className="inactive-badge">INACTIVE</div>
                        )}
                      </div>
                      <div className="worker-info">
                        <h4>{worker.name}</h4>
                        <p className="worker-desc">{worker.description}</p>
                        <div className="worker-stats-grid">
                          <div className="stat">
                            <span className="label">Hire Cost</span>
                            <span className="value">${worker.hire_cost.toLocaleString()}</span>
                          </div>
                          <div className="stat">
                            <span className="label">Income/Hour</span>
                            <span className="value">${worker.income_per_hour}</span>
                          </div>
                          <div className="stat">
                            <span className="label">🔓 Unlock Lvl</span>
                            <span className="value">{worker.min_level_required}</span>
                          </div>
                          <div className="stat full-width">
                            <span className={`rarity-badge ${worker.rarity}`}>{worker.rarity}</span>
                          </div>
                        </div>
                      </div>
                      <div className="worker-actions">
                        <button 
                          onClick={() => toggleWorkerActive(worker.id, worker.is_active)} 
                          className={`btn-toggle ${worker.is_active ? 'active' : 'inactive'}`}
                        >
                          {worker.is_active ? '✓ Active' : '✗ Inactive'}
                        </button>
                        <button onClick={() => openWorkerModal(worker)} className="btn-edit">
                          ✏️ Edit
                        </button>
                        <ConfirmButton
                          onConfirm={() => deleteWorker(worker.id)}
                          confirmText="Delete?"
                          className="btn-delete"
                          variant="danger"
                        >
                          🗑️ Delete
                        </ConfirmButton>
                      </div>
                    </div>
                  ))}
                  </div>
                  <button 
                    className="scroll-arrow scroll-arrow-right" 
                    onClick={() => scrollWorkers('right')}
                    aria-label="Scroll right"
                  >
                    →
                  </button>
                </div>
              </div>
            )}

            {/* Dock Boats Section */}
            {theLifeTab === 'boats' && (
              <div className="boats-management">
                <div className="section-header">
                  <h3>⚓ Dock Boat Schedules</h3>
                  <button onClick={() => openBoatModal()} className="btn-primary">
                    ➕ Schedule New Boat
                  </button>
                </div>

                <div className="boats-list">
                  {boats.map(boat => {
                    const now = new Date();
                    const arrival = new Date(boat.arrival_time);
                    const departure = new Date(boat.departure_time);
                    const isActive = now >= arrival && now < departure;
                    const isPast = now >= departure;
                    const hoursUntil = Math.round((arrival - now) / (1000 * 60 * 60));
                    
                    return (
                      <div key={boat.id} className={`boat-card ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}>
                        {boat.image_url && (
                          <div className="boat-image">
                            <img src={boat.image_url} alt={boat.name} />
                          </div>
                        )}
                        <div className="boat-header">
                          <h4>{boat.name}</h4>
                          <div className="boat-status">
                            {isActive && <span className="status-badge active">🟢 At Dock</span>}
                            {!isActive && !isPast && <span className="status-badge upcoming">🟡 Arriving in {hoursUntil}h</span>}
                            {isPast && <span className="status-badge past">⚫ Departed</span>}
                          </div>
                        </div>

                        <div className="boat-details">
                          <div className="boat-item">
                            <img src={boat.item?.icon} alt={boat.item?.name} style={{width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px'}} />
                            <span>{boat.item?.name || 'No item'}</span>
                          </div>

                          <div className="boat-times">
                            <div>📅 Arrives: {new Date(boat.arrival_time).toLocaleString()}</div>
                            <div>⏱️ Departs: {new Date(boat.departure_time).toLocaleString()}</div>
                          </div>

                          <div className="boat-capacity">
                            <span>Capacity: {boat.current_shipments}/{boat.max_shipments}</span>
                            <div className="capacity-bar">
                              <div 
                                className="capacity-fill" 
                                style={{width: `${(boat.current_shipments / boat.max_shipments) * 100}%`}}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="boat-actions">
                          <button onClick={() => openBoatModal(boat)} className="btn-edit">
                            ✏️ Edit
                          </button>
                          {isPast && (
                            <button onClick={() => rescheduleBoat(boat)} className="btn-reschedule">
                              🔄 Reschedule
                            </button>
                          )}
                          <button 
                            onClick={() => toggleBoatActive(boat.id, boat.is_active)} 
                            className={`btn-toggle ${boat.is_active ? 'active' : 'inactive'}`}
                          >
                            {boat.is_active ? '✅ Active' : '❌ Inactive'}
                          </button>
                          <ConfirmButton
                            onConfirm={() => deleteBoat(boat.id)}
                            confirmText="Delete?"
                            className="btn-delete"
                            variant="danger"
                          >
                            🗑️ Delete
                          </ConfirmButton>
                        </div>
                      </div>
                    );
                  })}
                  {boats.length === 0 && (
                    <p className="no-items">No boats scheduled yet</p>
                  )}
                </div>
              </div>
            )}

            {/* Event Messages Section */}
            {theLifeTab === 'messages' && (
              <div className="messages-management">
                <div className="section-header">
                  <h3>📸 Event Messages Management</h3>
                  <button onClick={() => openEventMessageModal()} className="btn-primary">
                    ➕ Add New Message
                  </button>
                </div>
                <p style={{color: '#a0aec0', marginBottom: '20px'}}>
                  Manage popup messages and images shown when players go to jail or hospital
                </p>

                <div className="messages-grid">
                  {eventMessages.map(msg => (
                    <div key={msg.id} className="message-admin-card">
                      <div className="message-preview-image">
                        {msg.image_url ? (
                          <img src={msg.image_url} alt="Event" />
                        ) : (
                          <div className="no-image">No Image</div>
                        )}
                        {!msg.is_active && (
                          <div className="inactive-badge">INACTIVE</div>
                        )}
                      </div>
                      <div className="message-info">
                        <span className={`event-type-badge ${msg.event_type.replace('_', '-')}`}>
                          {msg.event_type.replace('_', ' ').toUpperCase()}
                        </span>
                        <p className="message-text">{msg.message}</p>
                      </div>
                      <div className="message-actions">
                        <button 
                          onClick={() => toggleEventMessageActive(msg.id, msg.is_active)} 
                          className={`btn-toggle ${msg.is_active ? 'active' : 'inactive'}`}
                        >
                          {msg.is_active ? '✓ Active' : '✗ Inactive'}
                        </button>
                        <button onClick={() => openEventMessageModal(msg)} className="btn-edit">
                          ✏️ Edit
                        </button>
                        <ConfirmButton
                          onConfirm={() => deleteEventMessage(msg.id)}
                          confirmText="Delete?"
                          className="btn-delete"
                          variant="danger"
                        >
                          🗑️ Delete
                        </ConfirmButton>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category Info Section */}
            {theLifeTab === 'categories' && (
              <div className="categories-management">
                <div className="section-header">
                  <h3>📚 Category Info Management</h3>
                  <button onClick={() => openCategoryModal()} className="btn-primary">
                    ➕ Add New Category
                  </button>
                </div>
                <p style={{color: '#a0aec0', marginBottom: '20px'}}>
                  Manage the images and descriptions shown for each category in The Life stats bar
                </p>

                <div className="scroll-container-wrapper">
                  <button 
                    className="scroll-arrow scroll-arrow-left" 
                    onClick={() => scrollCategories('left')}
                    aria-label="Scroll left"
                  >
                    ←
                  </button>
                  <div className="categories-grid-scroll" ref={categoriesScrollRef}>
                  {categoryInfoList.map(cat => (
                    <div key={cat.id} className="category-admin-card">
                      <div className="category-preview-image">
                        {cat.image_url ? (
                          <img src={cat.image_url} alt={cat.category_name} />
                        ) : (
                          <div className="no-image">No Image</div>
                        )}
                      </div>
                      <div className="category-info">
                        <div className="category-header-row">
                          <h4>{cat.category_name}</h4>
                          <span className="category-key-badge">{cat.category_key}</span>
                        </div>
                        <p className="category-desc">{cat.description}</p>
                      </div>
                      <div className="category-actions">
                        <button onClick={() => openCategoryModal(cat)} className="btn-edit">
                          ✏️ Edit
                        </button>
                        <ConfirmButton
                          onConfirm={() => deleteCategory(cat.id)}
                          confirmText="Delete?"
                          className="btn-delete"
                          variant="danger"
                        >
                          🗑️ Delete
                        </ConfirmButton>
                      </div>
                    </div>
                  ))}
                  </div>
                  <button 
                    className="scroll-arrow scroll-arrow-right" 
                    onClick={() => scrollCategories('right')}
                    aria-label="Scroll right"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Crime Side Panel - INPUTS-FIRST Design */}
          <SidePanel
            isOpen={showCrimeModal}
            onClose={closeCrimeModal}
            title={editingCrime ? 'Edit Crime' : 'Add New Crime'}
            size="large"
            footer={
              <>
                <button onClick={closeCrimeModal} className="btn-cancel">
                  Cancel
                </button>
                <button onClick={saveCrime} className="btn-save">
                  {editingCrime ? 'Update Crime' : 'Create Crime'}
                </button>
              </>
            }
          >
            <FormPanel density="default" showDensityToggle={true}>
              {/* CONTROL BLOCK - All operational inputs FIRST (sticky) */}
              <ControlBlock title="Core Crime Parameters">
                <ControlInput
                  label="Stamina Cost"
                  icon="⚡"
                  unit="pts"
                  value={crimeFormData.stamina_cost || 1}
                  onChange={(v) => setCrimeFormData({...crimeFormData, stamina_cost: v})}
                  min={1}
                  max={100}
                  step={1}
                />
                <ControlInput
                  label="Base Reward"
                  icon="💵"
                  unit="$"
                  value={crimeFormData.base_reward || 0}
                  onChange={(v) => setCrimeFormData({...crimeFormData, base_reward: v})}
                  min={0}
                  step={100}
                />
                <ControlInput
                  label="Max Reward"
                  icon="💎"
                  unit="$"
                  value={crimeFormData.max_reward || 0}
                  onChange={(v) => setCrimeFormData({...crimeFormData, max_reward: v})}
                  min={0}
                  step={100}
                />
                <ControlInput
                  label="XP Reward"
                  icon="⭐"
                  unit="xp"
                  value={crimeFormData.xp_reward || 0}
                  onChange={(v) => setCrimeFormData({...crimeFormData, xp_reward: v})}
                  min={0}
                  step={10}
                />
                <ControlInput
                  label="Success Rate"
                  icon="🎯"
                  unit="%"
                  value={crimeFormData.success_rate || 0}
                  onChange={(v) => setCrimeFormData({...crimeFormData, success_rate: Math.min(100, Math.max(0, v))})}
                  min={0}
                  max={100}
                  step={5}
                />
                <ControlInput
                  label="Jail Time"
                  icon="⏱️"
                  unit="min"
                  value={crimeFormData.jail_time_minutes || 0}
                  onChange={(v) => setCrimeFormData({...crimeFormData, jail_time_minutes: v})}
                  min={0}
                  step={1}
                />
                <ControlInput
                  label="HP Loss"
                  icon="❤️"
                  unit="hp"
                  value={crimeFormData.hp_loss_on_fail || 0}
                  onChange={(v) => setCrimeFormData({...crimeFormData, hp_loss_on_fail: v})}
                  min={0}
                  step={5}
                />
                <ControlInput
                  label="Min Level"
                  icon="🔓"
                  unit="lvl"
                  value={crimeFormData.min_level_required || 1}
                  onChange={(v) => setCrimeFormData({...crimeFormData, min_level_required: v})}
                  min={1}
                  step={1}
                />
              </ControlBlock>

              {/* LIVE OUTPUT - Calculated metrics */}
              <LiveOutput outputs={[
                { 
                  icon: '⏰', 
                  label: 'Earnings/Hour', 
                  value: (() => {
                    const avgReward = ((crimeFormData.base_reward || 0) + (crimeFormData.max_reward || 0)) / 2;
                    const successRate = (crimeFormData.success_rate || 0) / 100;
                    const staminaCost = crimeFormData.stamina_cost || 1;
                    const staminaPerHour = 60; // 1 stamina per minute
                    const crimesPerHour = Math.floor(staminaPerHour / staminaCost);
                    const hourlyEarnings = Math.round(crimesPerHour * avgReward * successRate);
                    return `$${hourlyEarnings.toLocaleString()}/h`;
                  })(),
                  highlight: true
                },
                { 
                  icon: '💰', 
                  label: 'Avg Reward', 
                  value: `$${Math.round(((crimeFormData.base_reward || 0) + (crimeFormData.max_reward || 0)) / 2).toLocaleString()}`,
                },
                { 
                  icon: '📊', 
                  label: 'Expected/Crime', 
                  value: `$${Math.round((((crimeFormData.base_reward || 0) + (crimeFormData.max_reward || 0)) / 2) * ((crimeFormData.success_rate || 0) / 100)).toLocaleString()}`,
                },
                { 
                  icon: '🔄', 
                  label: 'Crimes/Hour', 
                  value: `${Math.floor(60 / (crimeFormData.stamina_cost || 1))}x`,
                },
              ]} />

              {/* DETAILS SECTION - Name, description, image */}
              <FormSection title="Crime Details" icon="📝" defaultExpanded={true}>
                <FormField label="Crime Name" icon="🔫" required fullWidth>
                  <input
                    type="text"
                    value={crimeFormData.name}
                    onChange={(e) => setCrimeFormData({...crimeFormData, name: e.target.value})}
                    placeholder="e.g., Bank Heist"
                  />
                </FormField>

                <FormField label="Description" fullWidth>
                  <textarea
                    value={crimeFormData.description}
                    onChange={(e) => setCrimeFormData({...crimeFormData, description: e.target.value})}
                    placeholder="Describe what this crime involves..."
                    rows="2"
                  />
                </FormField>

                <FormField label="Crime Image" icon="🖼️" hint="Enter a URL or upload an image" fullWidth>
                  <input
                    type="text"
                    value={crimeFormData.image_url}
                    onChange={(e) => setCrimeFormData({...crimeFormData, image_url: e.target.value})}
                    placeholder="https://images.unsplash.com/..."
                  />
                </FormField>
                <ImagePreview src={crimeFormData.image_url} size="large" />
              </FormSection>

              {/* Item Drops Section - Only when editing */}
              {editingCrime && (
                <FormSection 
                  title="Item Drops" 
                  icon="💎" 
                  badge={crimeDrops.length > 0 ? { text: `${crimeDrops.length} items`, type: 'success' } : null}
                  defaultExpanded={crimeDrops.length > 0}
                >
                  {/* Existing Drops */}
                  {crimeDrops.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      {crimeDrops.map(drop => (
                        <InfoCard
                          key={drop.id}
                          icon={drop.item?.icon}
                          title={drop.item?.name || 'Unknown Item'}
                          stats={[
                            { icon: '🎲', value: `${drop.drop_chance}% chance` },
                            { icon: '📦', value: `Qty: ${drop.min_quantity}-${drop.max_quantity}` }
                          ]}
                          actions={
                            <button onClick={() => removeCrimeDrop(drop.id)}>Remove</button>
                          }
                        />
                      ))}
                    </div>
                  )}

                  <Divider label="Add New Drop" />

                  {/* Add New Drop Form */}
                  <FormRow columns={2}>
                    <FormField label="Item" icon="🎁">
                      <select
                        value={newDrop.item_id}
                        onChange={(e) => setNewDrop({...newDrop, item_id: e.target.value})}
                      >
                        <option value="">Select Item</option>
                        {items.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Drop Chance (%)" icon="🎲">
                      <input
                        type="number"
                        value={newDrop.drop_chance}
                        onChange={(e) => setNewDrop({...newDrop, drop_chance: parseInt(e.target.value) || 1})}
                        min="1"
                        max="100"
                      />
                    </FormField>
                  </FormRow>
                  <FormRow columns={2}>
                    <FormField label="Min Quantity" icon="📦">
                      <input
                        type="number"
                        value={newDrop.min_quantity}
                        onChange={(e) => setNewDrop({...newDrop, min_quantity: parseInt(e.target.value) || 1})}
                        min="1"
                      />
                    </FormField>
                    <FormField label="Max Quantity" icon="📦">
                      <input
                        type="number"
                        value={newDrop.max_quantity}
                        onChange={(e) => setNewDrop({...newDrop, max_quantity: parseInt(e.target.value) || 1})}
                        min="1"
                      />
                    </FormField>
                  </FormRow>
                  <button 
                    onClick={addCrimeDrop}
                    className="btn-primary"
                    style={{ marginTop: '12px' }}
                  >
                    + Add Drop
                  </button>
                </FormSection>
              )}
            </FormPanel>
          </SidePanel>

          {/* Business Side Panel - Refactored with FormPanel System */}
          <SidePanel
            isOpen={showBusinessModal}
            onClose={closeBusinessModal}
            title={editingBusiness ? 'Edit Business' : 'Add New Business'}
            size="large"
            footer={
              <>
                <button onClick={closeBusinessModal} className="btn-cancel">
                  Cancel
                </button>
                <button onClick={saveBusiness} className="btn-save">
                  {editingBusiness ? 'Update Business' : 'Create Business'}
                </button>
              </>
            }
          >
            <FormPanel density="default" showDensityToggle={true}>
              {/* CONTROL BLOCK - All operational inputs FIRST (sticky) */}
              <ControlBlock title="Core Business Parameters">
                <ControlInput
                  label="Purchase Price"
                  icon="🏷️"
                  unit="$"
                  value={businessFormData.purchase_price || 0}
                  onChange={(v) => setBusinessFormData({...businessFormData, purchase_price: v})}
                  min={0}
                  step={1000}
                />
                <ControlInput
                  label="Production Cost"
                  icon="⚙️"
                  unit="$/run"
                  value={businessFormData.production_cost || 0}
                  onChange={(v) => setBusinessFormData({...businessFormData, production_cost: v})}
                  min={0}
                  step={100}
                />
                <ControlInput
                  label="Stamina Cost"
                  icon="⚡"
                  unit="pts"
                  value={businessFormData.stamina_cost || 0}
                  onChange={(v) => setBusinessFormData({...businessFormData, stamina_cost: v})}
                  min={0}
                  step={1}
                />
                <ControlInput
                  label="Duration"
                  icon="⏱️"
                  unit="min"
                  value={businessFormData.duration_minutes || 1}
                  onChange={(v) => setBusinessFormData({...businessFormData, duration_minutes: v})}
                  min={1}
                  step={5}
                />
                <ControlInput
                  label="Cash Profit"
                  icon="💰"
                  unit="$"
                  value={businessFormData.profit || 0}
                  onChange={(v) => setBusinessFormData({...businessFormData, profit: v})}
                  min={0}
                  step={500}
                />
                <ControlInput
                  label="Min Level"
                  icon="🔓"
                  unit="lvl"
                  value={businessFormData.min_level_required || 1}
                  onChange={(v) => setBusinessFormData({...businessFormData, min_level_required: v})}
                  min={1}
                  step={1}
                />
                <ControlInput
                  label="Reward Type"
                  icon="🎁"
                  type="select"
                  value={businessFormData.reward_type || 'cash'}
                  onChange={(v) => setBusinessFormData({...businessFormData, reward_type: v})}
                  options={[
                    { value: 'cash', label: '💵 Cash' },
                    { value: 'items', label: '🎒 Items' }
                  ]}
                />
              </ControlBlock>

              {/* LIVE OUTPUT - Calculated metrics */}
              <LiveOutput outputs={[
                { 
                  icon: '💵', 
                  label: 'Net Profit/Run', 
                  value: `$${((businessFormData.profit || 0) - (businessFormData.production_cost || 0)).toLocaleString()}`,
                  highlight: true,
                  variant: ((businessFormData.profit || 0) - (businessFormData.production_cost || 0)) > 0 ? '' : 'danger'
                },
                { 
                  icon: '⏰', 
                  label: 'Profit/Hour', 
                  value: businessFormData.duration_minutes > 0 
                    ? `$${Math.round((((businessFormData.profit || 0) - (businessFormData.production_cost || 0)) / businessFormData.duration_minutes) * 60).toLocaleString()}/h`
                    : '$0/h',
                },
                { 
                  icon: '📊', 
                  label: 'ROI', 
                  value: businessFormData.purchase_price > 0 && ((businessFormData.profit || 0) - (businessFormData.production_cost || 0)) > 0
                    ? `${Math.ceil(businessFormData.purchase_price / ((businessFormData.profit || 0) - (businessFormData.production_cost || 0)))} runs`
                    : '∞ runs',
                },
                { 
                  icon: '🕐', 
                  label: 'Break-Even', 
                  value: businessFormData.purchase_price > 0 && businessFormData.duration_minutes > 0 && ((businessFormData.profit || 0) - (businessFormData.production_cost || 0)) > 0
                    ? `${Math.round((businessFormData.purchase_price / (((businessFormData.profit || 0) - (businessFormData.production_cost || 0)) / businessFormData.duration_minutes)) / 60)} hrs`
                    : '∞',
                },
              ]} />

              {/* DETAILS SECTION - Name, description, image */}
              <FormSection title="Business Details" icon="💼" defaultExpanded={true}>
                <FormField label="Business Name" icon="🏢" required fullWidth>
                  <input
                    type="text"
                    value={businessFormData.name}
                    onChange={(e) => setBusinessFormData({...businessFormData, name: e.target.value})}
                    placeholder="e.g., Weed Farm"
                  />
                </FormField>

                <FormField label="Description" fullWidth>
                  <textarea
                    value={businessFormData.description}
                    onChange={(e) => setBusinessFormData({...businessFormData, description: e.target.value})}
                    placeholder="Describe what this business produces..."
                    rows="2"
                  />
                </FormField>

                <FormField label="Unit Name" hint="e.g., grams, pills, bags">
                  <input
                    type="text"
                    value={businessFormData.unit_name}
                    onChange={(e) => setBusinessFormData({...businessFormData, unit_name: e.target.value})}
                    placeholder="grams"
                  />
                </FormField>

                <FormField label="Business Image" icon="🖼️" fullWidth>
                  <input
                    type="text"
                    value={businessFormData.image_url}
                    onChange={(e) => setBusinessFormData({...businessFormData, image_url: e.target.value})}
                    placeholder="https://images.unsplash.com/..."
                  />
                </FormField>
                <ImagePreview src={businessFormData.image_url} size="large" />
              </FormSection>

              {/* Item Rewards Section - Only show when reward_type is items */}
              {businessFormData.reward_type === 'items' && (
                <FormSection title="Item Reward" icon="🎁">
                  <FormRow columns={2}>
                    <FormField label="Reward Item" icon="🎁">
                      <select
                        value={businessFormData.reward_item_id || ''}
                        onChange={(e) => setBusinessFormData({...businessFormData, reward_item_id: e.target.value || null})}
                      >
                        <option value="">Select Item...</option>
                        {availableItems.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.rarity})
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Quantity" icon="📦">
                      <input
                        type="number"
                        value={businessFormData.reward_item_quantity}
                        onChange={(e) => setBusinessFormData({...businessFormData, reward_item_quantity: parseInt(e.target.value) || 1})}
                        min="1"
                      />
                    </FormField>
                  </FormRow>
                </FormSection>
              )}

              {/* Settings Section */}
              <FormSection title="Settings" icon="⚙️" defaultExpanded={false}>
                <ToggleField
                  label="Business Active"
                  icon="✅"
                  checked={businessFormData.is_active}
                  onChange={(checked) => setBusinessFormData({...businessFormData, is_active: checked})}
                  hint="Visible and available to players"
                />
                <ToggleField
                  label="Upgradeable"
                  icon="📈"
                  checked={businessFormData.is_upgradeable}
                  onChange={(checked) => setBusinessFormData({...businessFormData, is_upgradeable: checked})}
                  hint="Allow players to upgrade for better production"
                />

                {/* Conversion Rate for Money Laundering */}
                {(businessFormData.name?.toLowerCase().includes('launder') || businessFormData.name?.toLowerCase().includes('wash')) && (
                  <FormField label="Conversion Fee (%)" hint="Fee taken from item value (e.g., 18% = player gets 82%)">
                    <input
                      type="number"
                      step="0.01"
                      value={businessFormData.conversion_rate ? businessFormData.conversion_rate * 100 : ''}
                      onChange={(e) => setBusinessFormData({...businessFormData, conversion_rate: e.target.value ? parseFloat(e.target.value) / 100 : null})}
                      min="0"
                      max="100"
                      placeholder="18"
                    />
                  </FormField>
                )}
              </FormSection>

              {/* Required Items Section - Only when editing */}
              {editingBusiness && (
                <FormSection 
                  title="Required Items" 
                  icon="📦" 
                  badge={businessRequiredItems.length > 0 ? { text: `${businessRequiredItems.length} items`, type: 'success' } : { text: 'Optional', type: '' }}
                  defaultExpanded={businessRequiredItems.length > 0}
                >
                  <p style={{ fontSize: '13px', color: 'var(--admin-text-muted)', marginBottom: '16px' }}>
                    Add multiple items with different rewards. E.g., Car Stripping accepts: Old Car ($500), Sports Car ($2000)
                  </p>

                  {/* Existing Required Items */}
                  {businessRequiredItems.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      {businessRequiredItems.map(reqItem => (
                        <InfoCard
                          key={reqItem.id}
                          icon={reqItem.item?.icon}
                          title={`${reqItem.item?.name || 'Unknown'} x${reqItem.quantity_required}`}
                          stats={[
                            { icon: '💵', value: `$${reqItem.reward_cash?.toLocaleString() || 0}` },
                            ...(reqItem.reward_item_id ? [{ icon: '🎁', value: `+${reqItem.reward_item_quantity}x Item` }] : [])
                          ]}
                          actions={
                            <button onClick={() => removeRequiredItem(reqItem.id)}>Remove</button>
                          }
                        />
                      ))}
                    </div>
                  )}

                  <Divider label="Add New Required Item" />

                  {/* Add New Required Item Form */}
                  <FormRow columns={2}>
                    <FormField label="Item" icon="🎁">
                      <select
                        value={newRequiredItem.item_id}
                        onChange={(e) => setNewRequiredItem({...newRequiredItem, item_id: e.target.value})}
                      >
                        <option value="">Select Item...</option>
                        {availableItems.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.type})
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Qty Required" icon="📦">
                      <input
                        type="number"
                        value={newRequiredItem.quantity_required}
                        onChange={(e) => setNewRequiredItem({...newRequiredItem, quantity_required: parseInt(e.target.value) || 1})}
                        min="1"
                      />
                    </FormField>
                  </FormRow>
                  <FormRow columns={3}>
                    <FormField label="Cash Reward" icon="💵">
                      <input
                        type="number"
                        value={newRequiredItem.reward_cash}
                        onChange={(e) => setNewRequiredItem({...newRequiredItem, reward_cash: parseInt(e.target.value) || 0})}
                        min="0"
                      />
                    </FormField>
                    <FormField label="Bonus Item" icon="🎁">
                      <select
                        value={newRequiredItem.reward_item_id || ''}
                        onChange={(e) => setNewRequiredItem({...newRequiredItem, reward_item_id: e.target.value || null})}
                      >
                        <option value="">None</option>
                        {availableItems.map(item => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Bonus Qty" icon="📦">
                      <input
                        type="number"
                        value={newRequiredItem.reward_item_quantity}
                        onChange={(e) => setNewRequiredItem({...newRequiredItem, reward_item_quantity: parseInt(e.target.value) || 1})}
                        min="1"
                      />
                    </FormField>
                  </FormRow>
                  <button 
                    onClick={addRequiredItem}
                    disabled={!newRequiredItem.item_id}
                    className="btn-primary"
                    style={{ marginTop: '12px', opacity: newRequiredItem.item_id ? 1 : 0.5 }}
                  >
                    + Add Required Item
                  </button>
                </FormSection>
              )}
            </FormPanel>
          </SidePanel>

          {/* Item Side Panel - INPUTS-FIRST Design */}
          <SidePanel
            isOpen={showItemModal}
            onClose={closeItemModal}
            title={editingItem ? 'Edit Item' : 'Add New Item'}
            size="large"
            footer={
              <>
                <button onClick={closeItemModal} className="btn-cancel">
                  Cancel
                </button>
                <button onClick={saveItem} className="btn-save">
                  {editingItem ? 'Update Item' : 'Create Item'}
                </button>
              </>
            }
          >
            <FormPanel density="default" showDensityToggle={true}>
              {/* CONTROL BLOCK - All operational inputs FIRST (sticky) */}
              <ControlBlock title="Core Item Parameters">
                <ControlInput
                  label="Type"
                  icon="📦"
                  type="select"
                  value={itemFormData.type || 'consumable'}
                  onChange={(v) => setItemFormData({...itemFormData, type: v})}
                  options={[
                    { value: 'consumable', label: '🍔 Consumable' },
                    { value: 'equipment', label: '⚔️ Equipment' },
                    { value: 'special', label: '✨ Special' },
                    { value: 'collectible', label: '🏆 Collectible' },
                    { value: 'business_reward', label: '🏭 Business Reward' }
                  ]}
                />
                <ControlInput
                  label="Rarity"
                  icon="✨"
                  type="select"
                  value={itemFormData.rarity || 'common'}
                  onChange={(v) => setItemFormData({...itemFormData, rarity: v})}
                  options={[
                    { value: 'common', label: '⚪ Common' },
                    { value: 'rare', label: '🔵 Rare' },
                    { value: 'epic', label: '🟣 Epic' },
                    { value: 'legendary', label: '🟡 Legendary' }
                  ]}
                />
                <ControlInput
                  label="Boost Type"
                  icon="💪"
                  type="select"
                  value={itemBoostType || ''}
                  onChange={(v) => setItemBoostType(v)}
                  options={[
                    { value: '', label: 'None' },
                    { value: 'power', label: '🔫 Power' },
                    { value: 'defense', label: '🛡️ Defense' },
                    { value: 'intelligence', label: '🍀 Intelligence' }
                  ]}
                />
                <ControlInput
                  label="Boost Amount"
                  icon="⬆️"
                  unit="pts"
                  value={itemBoostAmount || 0}
                  onChange={(v) => setItemBoostAmount(v)}
                  min={0}
                  step={5}
                />
                <ControlInput
                  label="Effect Type"
                  icon="⚡"
                  type="select"
                  value={itemEffectType || ''}
                  onChange={(v) => setItemEffectType(v)}
                  options={[
                    { value: '', label: 'None' },
                    { value: 'heal', label: '❤️ Heal HP' },
                    { value: 'stamina', label: '⚡ Add Stamina' },
                    { value: 'xp_boost', label: '⭐ XP Boost' },
                    { value: 'cash', label: '💰 Add Cash' },
                    { value: 'jail_free', label: '🔓 Jail Free' }
                  ]}
                />
                <ControlInput
                  label="Effect Amount"
                  icon="📊"
                  unit="pts"
                  value={itemEffectValue || 0}
                  onChange={(v) => setItemEffectValue(v)}
                  min={0}
                  step={10}
                />
                <ControlInput
                  label="Resell Price"
                  icon="💵"
                  unit="$"
                  value={itemResellPrice || 0}
                  onChange={(v) => setItemResellPrice(v)}
                  min={0}
                  step={100}
                />
                <ControlInput
                  label="Durability"
                  icon="🔧"
                  unit="uses"
                  value={itemMaxDurability || 0}
                  onChange={(v) => setItemMaxDurability(v)}
                  min={0}
                  step={10}
                  placeholder="0 = ∞"
                />
              </ControlBlock>

              {/* LIVE OUTPUT - Calculated metrics */}
              <LiveOutput outputs={[
                { 
                  icon: itemFormData.type === 'equipment' ? '⚔️' : '🍔', 
                  label: 'Type', 
                  value: itemFormData.type?.charAt(0).toUpperCase() + itemFormData.type?.slice(1) || 'None'
                },
                { 
                  icon: itemFormData.rarity === 'legendary' ? '🟡' : itemFormData.rarity === 'epic' ? '🟣' : itemFormData.rarity === 'rare' ? '🔵' : '⚪', 
                  label: 'Rarity', 
                  value: itemFormData.rarity?.charAt(0).toUpperCase() + itemFormData.rarity?.slice(1) || 'Common',
                  highlight: itemFormData.rarity === 'legendary' || itemFormData.rarity === 'epic'
                },
                { 
                  icon: '💪', 
                  label: 'Stats', 
                  value: itemBoostType ? `+${itemBoostAmount} ${itemBoostType}` : 'No boost'
                },
                { 
                  icon: '💵', 
                  label: 'Value', 
                  value: itemResellPrice > 0 ? `$${itemResellPrice.toLocaleString()}` : 'Not sellable'
                },
              ]} />

              {/* DETAILS SECTION - Name, description, image */}
              <FormSection title="Item Details" icon="🎒" defaultExpanded={true}>
                <FormField label="Item Name" icon="📝" required fullWidth>
                  <input
                    type="text"
                    value={itemFormData.name}
                    onChange={(e) => setItemFormData({...itemFormData, name: e.target.value})}
                    placeholder="e.g., Desert Eagle, Riot Shield"
                  />
                </FormField>

                <FormField label="Description" fullWidth>
                  <textarea
                    value={itemFormData.description}
                    onChange={(e) => setItemFormData({...itemFormData, description: e.target.value})}
                    placeholder="Describe what this item does..."
                    rows="2"
                  />
                </FormField>

                <FormField label="Item Image" icon="🖼️" required fullWidth hint="Upload an image for this item">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setItemFormData({...itemFormData, icon: reader.result});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </FormField>
                <ImagePreview src={itemFormData.icon} size="medium" />
              </FormSection>

              {/* Addiction Section - Only for stamina items */}
              {itemEffectType === 'stamina' && (
                <FormSection title="Addiction" icon="⚠️" variant="warning">
                  <FormField label="Addiction Amount" hint="How much addiction this item causes (0 = none)">
                    <input
                      type="number"
                      value={itemAddictionAmount}
                      onChange={(e) => setItemAddictionAmount(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                    />
                  </FormField>
                </FormSection>
              )}

              {/* Trading Options Section */}
              <FormSection title="Trading Options" icon="🔄" defaultExpanded={true}>
                <ToggleField
                  label="Tradeable"
                  icon="🤝"
                  checked={itemFormData.tradeable}
                  onChange={(checked) => setItemFormData({...itemFormData, tradeable: checked})}
                  hint="Can be traded between players"
                />
                <ToggleField
                  label="Sellable on Streets"
                  icon="🏙️"
                  checked={itemSellableOnStreets}
                  onChange={setItemSellableOnStreets}
                  hint="Can be sold to NPCs on the streets"
                />
                <ToggleField
                  label="Sellable at Docks"
                  icon="⚓"
                  checked={itemSellableAtDocks}
                  onChange={setItemSellableAtDocks}
                  hint="Can be sold to boats at the docks"
                />
              </FormSection>
            </FormPanel>
          </SidePanel>

          {/* Store Item Side Panel - INPUTS-FIRST Design */}
          <SidePanel
            isOpen={showStoreModal}
            onClose={closeStoreModal}
            title={editingStoreItem ? 'Edit Store Item' : 'Add Store Item'}
            size="large"
            footer={
              <>
                <button onClick={closeStoreModal} className="btn-secondary">Cancel</button>
                <button onClick={saveStoreItem} className="btn-primary">
                  {editingStoreItem ? 'Update' : 'Add'} Store Item
                </button>
              </>
            }
          >
            <FormPanel density="default" showDensityToggle={true}>
              {/* CONTROL BLOCK - All operational inputs FIRST (sticky) */}
              <ControlBlock title="Core Store Parameters">
                <ControlInput
                  label="Select Item"
                  icon="🎁"
                  type="select"
                  value={storeFormData.item_id || ''}
                  onChange={(v) => setStoreFormData({...storeFormData, item_id: v})}
                  options={[
                    { value: '', label: 'Choose item...' },
                    ...items.map(item => ({ value: item.id, label: `${item.name} (${item.type})` }))
                  ]}
                />
                <ControlInput
                  label="Category"
                  icon="🏷️"
                  type="select"
                  value={storeFormData.category || 'weapons'}
                  onChange={(v) => setStoreFormData({...storeFormData, category: v})}
                  options={[
                    { value: 'weapons', label: '⚔️ Weapons' },
                    { value: 'gear', label: '🛡️ Gear' },
                    { value: 'healing', label: '💊 Healing' },
                    { value: 'valuable', label: '💎 Valuable' },
                    { value: 'limited_time', label: '⏰ Limited Time' }
                  ]}
                />
                <ControlInput
                  label="Price"
                  icon="💰"
                  unit="$"
                  value={storeFormData.price || 0}
                  onChange={(v) => setStoreFormData({...storeFormData, price: v})}
                  min={0}
                  step={100}
                />
                <ControlInput
                  label="Stock"
                  icon="📦"
                  unit="qty"
                  value={storeFormData.stock_quantity || 0}
                  onChange={(v) => setStoreFormData({...storeFormData, stock_quantity: v || null})}
                  min={0}
                  step={1}
                  placeholder="0 = ∞"
                />
                <ControlInput
                  label="Display Order"
                  icon="📋"
                  unit="#"
                  value={storeFormData.display_order || 0}
                  onChange={(v) => setStoreFormData({...storeFormData, display_order: v})}
                  min={0}
                  step={1}
                />
              </ControlBlock>

              {/* LIVE OUTPUT - Status summary */}
              <LiveOutput outputs={[
                { 
                  icon: '💰', 
                  label: 'Price', 
                  value: `$${(storeFormData.price || 0).toLocaleString()}`,
                  highlight: true
                },
                { 
                  icon: '📦', 
                  label: 'Stock', 
                  value: storeFormData.stock_quantity ? storeFormData.stock_quantity.toString() : '∞ Unlimited'
                },
                { 
                  icon: '🏷️', 
                  label: 'Category', 
                  value: storeFormData.category?.charAt(0).toUpperCase() + storeFormData.category?.slice(1) || 'None'
                },
                { 
                  icon: storeFormData.is_active ? '✅' : '❌', 
                  label: 'Status', 
                  value: storeFormData.is_active ? 'Active' : 'Inactive',
                  variant: storeFormData.is_active ? '' : 'warning'
                },
              ]} />

              {/* Limited Time Section */}
              <FormSection title="Limited Time Offer" icon="⏰" defaultExpanded={storeFormData.category === 'limited_time'}>
                <FormField label="Available Until" hint="Leave empty for permanent listing">
                  <input
                    type="datetime-local"
                    value={storeFormData.limited_time_until}
                    onChange={(e) => setStoreFormData({...storeFormData, limited_time_until: e.target.value})}
                  />
                </FormField>
              </FormSection>

              {/* Settings Section */}
              <FormSection title="Store Settings" icon="⚙️" defaultExpanded={true}>
                <ToggleField
                  label="Active in Store"
                  icon="🏪"
                  checked={storeFormData.is_active}
                  onChange={(checked) => setStoreFormData({...storeFormData, is_active: checked})}
                  hint="When enabled, item is visible and purchasable"
                />
              </FormSection>
            </FormPanel>
          </SidePanel>

          {/* Worker Side Panel - INPUTS-FIRST Design */}
          <SidePanel
            isOpen={showWorkerModal}
            onClose={closeWorkerModal}
            title={editingWorker ? 'Edit Worker' : 'Add New Worker'}
            size="large"
            footer={
              <>
                <button onClick={closeWorkerModal} className="btn-cancel">Cancel</button>
                <button onClick={saveWorker} className="btn-save">
                  {editingWorker ? 'Update Worker' : 'Create Worker'}
                </button>
              </>
            }
          >
            <FormPanel density="default" showDensityToggle={true}>
              {/* CONTROL BLOCK - All operational inputs FIRST (sticky) */}
              <ControlBlock title="Core Worker Parameters">
                <ControlInput
                  label="Hire Cost"
                  icon="💵"
                  unit="$"
                  value={workerFormData.hire_cost || 0}
                  onChange={(v) => setWorkerFormData({...workerFormData, hire_cost: v})}
                  min={0}
                  step={1000}
                />
                <ControlInput
                  label="Income/Hour"
                  icon="⏰"
                  unit="$/h"
                  value={workerFormData.income_per_hour || 0}
                  onChange={(v) => setWorkerFormData({...workerFormData, income_per_hour: v})}
                  min={0}
                  step={50}
                />
                <ControlInput
                  label="Min Level"
                  icon="🔓"
                  unit="lvl"
                  value={workerFormData.min_level_required || 1}
                  onChange={(v) => setWorkerFormData({...workerFormData, min_level_required: v})}
                  min={1}
                  step={1}
                />
                <ControlInput
                  label="Rarity"
                  icon="✨"
                  type="select"
                  value={workerFormData.rarity || 'common'}
                  onChange={(v) => setWorkerFormData({...workerFormData, rarity: v})}
                  options={[
                    { value: 'common', label: '⚪ Common' },
                    { value: 'rare', label: '🔵 Rare' },
                    { value: 'epic', label: '🟣 Epic' },
                    { value: 'legendary', label: '🟡 Legendary' }
                  ]}
                />
              </ControlBlock>

              {/* LIVE OUTPUT - Calculated metrics */}
              <LiveOutput outputs={[
                { 
                  icon: '💵', 
                  label: 'Hire Cost', 
                  value: `$${(workerFormData.hire_cost || 0).toLocaleString()}`
                },
                { 
                  icon: '⏰', 
                  label: 'Income/Hour', 
                  value: `$${(workerFormData.income_per_hour || 0).toLocaleString()}/h`,
                  highlight: true
                },
                { 
                  icon: '📊', 
                  label: 'ROI (Break-Even)', 
                  value: workerFormData.hire_cost > 0 && workerFormData.income_per_hour > 0 
                    ? `${Math.ceil(workerFormData.hire_cost / workerFormData.income_per_hour)} hrs`
                    : '∞'
                },
                { 
                  icon: '💰', 
                  label: 'Daily Earnings', 
                  value: `$${((workerFormData.income_per_hour || 0) * 24).toLocaleString()}/day`
                },
              ]} />

              {/* DETAILS SECTION - Name, description, image */}
              <FormSection title="Worker Details" icon="👤" defaultExpanded={true}>
                <FormField label="Worker Name" required hint="Display name in the game">
                  <input
                    type="text"
                    value={workerFormData.name}
                    onChange={(e) => setWorkerFormData({...workerFormData, name: e.target.value})}
                    placeholder="e.g., Diamond, Sapphire"
                  />
                </FormField>

                <FormField label="Description" hint="Background or personality">
                  <textarea
                    value={workerFormData.description}
                    onChange={(e) => setWorkerFormData({...workerFormData, description: e.target.value})}
                    placeholder="Describe this worker..."
                    rows="3"
                  />
                </FormField>

                <FormField label="Image URL" hint="Worker portrait/avatar">
                  <input
                    type="text"
                    value={workerFormData.image_url}
                    onChange={(e) => setWorkerFormData({...workerFormData, image_url: e.target.value})}
                    placeholder="https://images.unsplash.com/..."
                  />
                </FormField>
                {workerFormData.image_url && (
                  <ImagePreview src={workerFormData.image_url} alt={workerFormData.name || 'Worker'} />
                )}
              </FormSection>

              {/* Status Section */}
              <FormSection title="Status" icon="⚙️" defaultExpanded={true}>
                <ToggleField
                  label="Active"
                  icon="👁️"
                  checked={workerFormData.is_active}
                  onChange={(checked) => setWorkerFormData({...workerFormData, is_active: checked})}
                  hint="When enabled, worker is visible and hireable by players"
                />
              </FormSection>
            </FormPanel>
          </SidePanel>

          {/* Boat Side Panel */}
          <SidePanel
            isOpen={showBoatModal}
            onClose={closeBoatModal}
            title={editingBoat ? 'Edit Boat Schedule' : 'Schedule New Boat'}
            size="large"
            footer={
              <>
                <button onClick={closeBoatModal} className="btn-cancel">
                  Cancel
                </button>
                <button onClick={saveBoat} className="btn-save">
                  {editingBoat ? 'Update Boat' : 'Schedule Boat'}
                </button>
              </>
            }
          >
            <div className="form-group">
                    <label>Boat Name *</label>
                    <input
                      type="text"
                      value={boatFormData.name}
                      onChange={(e) => setBoatFormData({...boatFormData, name: e.target.value})}
                      placeholder="e.g., Morning Cargo Ship, Night Runner"
                    />
                  </div>

                  <div className="form-group">
                    <label>Boat Image URL</label>
                    <input
                      type="text"
                      value={boatFormData.image_url}
                      onChange={(e) => setBoatFormData({...boatFormData, image_url: e.target.value})}
                      placeholder="https://images.unsplash.com/..."
                    />
                    {boatFormData.image_url && (
                      <div style={{marginTop: '12px', textAlign: 'center'}}>
                        <img src={boatFormData.image_url} alt="Boat Preview" style={{width: '150px', height: '100px', objectFit: 'cover', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.1)'}} />
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Item to Pickup *</label>
                    <select
                      value={boatFormData.item_id}
                      onChange={(e) => setBoatFormData({...boatFormData, item_id: e.target.value})}
                    >
                      <option value="">Select an item</option>
                      {items.filter(item => item.sellable_at_docks).map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Arrival Time *</label>
                    <input
                      type="datetime-local"
                      value={boatFormData.arrival_time}
                      onChange={(e) => setBoatFormData({...boatFormData, arrival_time: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label>Departure Time *</label>
                    <input
                      type="datetime-local"
                      value={boatFormData.departure_time}
                      onChange={(e) => setBoatFormData({...boatFormData, departure_time: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label>Max Shipments</label>
                    <input
                      type="number"
                      value={boatFormData.max_shipments}
                      onChange={(e) => setBoatFormData({...boatFormData, max_shipments: parseInt(e.target.value) || 100})}
                      placeholder="100"
                      min="1"
                    />
                  </div>

                  <div className="form-group">
                    <label style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                      <input
                        type="checkbox"
                        checked={boatFormData.is_active}
                        onChange={(e) => setBoatFormData({...boatFormData, is_active: e.target.checked})}
                        style={{width: 'auto'}}
                      />
                      <span>Active</span>
                    </label>
                  </div>
          </SidePanel>

          {/* Event Message Side Panel */}
          <SidePanel
            isOpen={showEventMessageModal}
            onClose={closeEventMessageModal}
            title={editingEventMessage ? 'Edit Event Message' : 'Add New Event Message'}
            size="large"
            footer={
              <>
                <button onClick={closeEventMessageModal} className="btn-cancel">
                  Cancel
                </button>
                <button onClick={saveEventMessage} className="btn-save">
                  {editingEventMessage ? 'Update Message' : 'Create Message'}
                </button>
              </>
            }
          >
            <div className="form-group">
                    <label>Event Type *</label>
                    <select
                      value={eventMessageFormData.event_type}
                      onChange={(e) => setEventMessageFormData({...eventMessageFormData, event_type: e.target.value})}
                    >
                      <option value="">-- Select Event Type --</option>
                      <optgroup label="⛓️ Jail Events">
                        <option value="jail_crime">Jail - Crime Failed</option>
                        <option value="jail_street">Jail - Street Resell Caught</option>
                        <option value="jail_pvp">Jail - PVP Arrest</option>
                        <option value="jail_dock">Jail - Dock Smuggling Caught</option>
                      </optgroup>
                      <optgroup label="🏥 Hospital Events">
                        <option value="hospital_beaten">Hospital - Beaten Up</option>
                        <option value="hospital_hp_loss">Hospital - HP Loss</option>
                        <option value="hospital_overdose">Hospital - Overdose</option>
                        <option value="hospital_pvp">Hospital - Lost PVP Fight</option>
                      </optgroup>
                      <optgroup label="💰 Crime Events">
                        <option value="crime_success">Crime - Success</option>
                        <option value="crime_fail">Crime - Failed</option>
                        <option value="crime_jackpot">Crime - Jackpot Reward</option>
                      </optgroup>
                      <optgroup label="🏢 Business Events">
                        <option value="business_success">Business - Production Success</option>
                        <option value="business_fail">Business - Production Failed</option>
                        <option value="business_raid">Business - Police Raid</option>
                      </optgroup>
                      <optgroup label="⚔️ PVP Events">
                        <option value="pvp_win">PVP - Victory</option>
                        <option value="pvp_lose">PVP - Defeat</option>
                        <option value="pvp_draw">PVP - Draw</option>
                      </optgroup>
                      <optgroup label="🚢 Dock Events">
                        <option value="dock_success">Dock - Shipment Success</option>
                        <option value="dock_fail">Dock - Shipment Seized</option>
                      </optgroup>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Message *</label>
                    <textarea
                      value={eventMessageFormData.message}
                      onChange={(e) => setEventMessageFormData({...eventMessageFormData, message: e.target.value})}
                      placeholder="e.g., Caught red-handed! Better luck next time..."
                      rows="3"
                    />
                  </div>

                  <div className="form-group">
                    <label>Image URL *</label>
                    <input
                      type="text"
                      value={eventMessageFormData.image_url}
                      onChange={(e) => setEventMessageFormData({...eventMessageFormData, image_url: e.target.value})}
                      placeholder="https://images.unsplash.com/..."
                    />
                    {eventMessageFormData.image_url && (
                      <div style={{marginTop: '10px'}}>
                        <img src={eventMessageFormData.image_url} alt="Preview" style={{width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px'}} />
                      </div>
                    )}
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={eventMessageFormData.is_active}
                        onChange={(e) => setEventMessageFormData({...eventMessageFormData, is_active: e.target.checked})}
                      />
                      <span>Active (visible to players)</span>
                    </label>
                  </div>
          </SidePanel>

          {/* Category Info Side Panel */}
          <SidePanel
            isOpen={showCategoryModal}
            onClose={closeCategoryModal}
            title={editingCategory ? 'Edit Category Info' : 'Add New Category Info'}
            size="large"
            footer={
              <>
                <button onClick={closeCategoryModal} className="btn-cancel">
                  Cancel
                </button>
                <button onClick={saveCategory} className="btn-save">
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </>
            }
          >
            <div className="form-group">
                    <label>Category Key *</label>
                    <select
                      value={categoryFormData.category_key}
                      onChange={(e) => setCategoryFormData({...categoryFormData, category_key: e.target.value})}
                      disabled={!!editingCategory}
                      style={{opacity: editingCategory ? 0.6 : 1}}
                    >
                      <option value="">-- Select Category --</option>
                      <option value="crimes">🔫 Crimes</option>
                      <option value="pvp">👊 PVP</option>
                      <option value="businesses">🏢 Businesses</option>
                      <option value="brothel">💋 Brothel</option>
                      <option value="casino">🎲 Casino</option>
                      <option value="highstakes">🎰 High Stakes</option>
                      <option value="stash">🎒 Stash (Inventory)</option>
                      <option value="jail">⛓️ Jail</option>
                      <option value="hospital">🏥 Hospital</option>
                      <option value="blackmarket">🕶️ Black Market</option>
                      <option value="docks">🚢 Docks</option>
                      <option value="bank">🏦 Bank</option>
                      <option value="leaderboard">🏆 Leaderboard</option>
                      <option value="stats">📊 Stats</option>
                      <option value="skills">💪 Skills</option>
                      <option value="profile">👤 Profile</option>
                      <option value="stockmarket">📈 Stock Market</option>
                    </select>
                    {editingCategory && (
                      <small style={{color: '#a0aec0', display: 'block', marginTop: '5px'}}>
                        Category key cannot be changed after creation
                      </small>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Category Name *</label>
                    <input
                      type="text"
                      value={categoryFormData.category_name}
                      onChange={(e) => setCategoryFormData({...categoryFormData, category_name: e.target.value})}
                      placeholder="e.g., Crimes"
                    />
                  </div>

                  <div className="form-group">
                    <label>Description *</label>
                    <textarea
                      value={categoryFormData.description}
                      onChange={(e) => setCategoryFormData({...categoryFormData, description: e.target.value})}
                      placeholder="Describe this category to help players understand what it offers..."
                      rows="4"
                    />
                  </div>

                  <div className="form-group">
                    <label>Image URL or Upload *</label>
                    <input
                      type="text"
                      value={categoryFormData.image_url}
                      onChange={(e) => setCategoryFormData({...categoryFormData, image_url: e.target.value})}
                      placeholder="https://images.unsplash.com/... or upload below"
                    />
                    <div style={{marginTop: '10px'}}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCategoryImageUpload}
                        style={{display: 'none'}}
                        id="category-image-upload"
                      />
                      <label 
                        htmlFor="category-image-upload" 
                        className="btn-upload"
                        style={{
                          display: 'inline-block',
                          padding: '8px 16px',
                          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.1))',
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          borderRadius: '6px',
                          color: '#d4af37',
                          cursor: uploadingCategoryImage ? 'not-allowed' : 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          opacity: uploadingCategoryImage ? 0.5 : 1
                        }}
                      >
                        {uploadingCategoryImage ? '📤 Uploading...' : '📁 Upload Image'}
                      </label>
                      <small style={{display: 'block', color: '#a0aec0', marginTop: '5px'}}>
                        Max 5MB. Supported: JPG, PNG, WebP, GIF
                      </small>
                    </div>
                    {categoryFormData.image_url && (
                      <div style={{marginTop: '10px'}}>
                        <img 
                          src={categoryFormData.image_url} 
                          alt="Preview" 
                          style={{
                            width: '100%', 
                            maxHeight: '200px', 
                            objectFit: 'cover', 
                            borderRadius: '8px'
                          }} 
                        />
                      </div>
                    )}
                  </div>
          </SidePanel>
        </>
      )}

      {/* Daily Wheel Tab */}
      {activeTab === 'wheel' && (
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
                      {prize.is_active ? '✓ Active' : '✗ Inactive'}
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
                    <label>Label *</label>
                    <input
                      type="text"
                      value={prizeFormData.label}
                      onChange={(e) => setPrizeFormData({...prizeFormData, label: e.target.value})}
                      placeholder="500 Points"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Icon (Emoji) *</label>
                    <input
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
                      <label>Background Color *</label>
                      <input
                        type="color"
                        value={prizeFormData.color}
                        onChange={(e) => setPrizeFormData({...prizeFormData, color: e.target.value})}
                      />
                      <input
                        type="text"
                        value={prizeFormData.color}
                        onChange={(e) => setPrizeFormData({...prizeFormData, color: e.target.value})}
                        placeholder="#1a1a1a"
                        style={{ marginTop: '5px' }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Text Color *</label>
                      <input
                        type="color"
                        value={prizeFormData.text_color}
                        onChange={(e) => setPrizeFormData({...prizeFormData, text_color: e.target.value})}
                      />
                      <input
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
                      <label>StreamElements Points</label>
                      <input
                        type="number"
                        value={prizeFormData.se_points}
                        onChange={(e) => setPrizeFormData({...prizeFormData, se_points: e.target.value})}
                        placeholder="0"
                        min="0"
                      />
                      <small>0 = no points awarded</small>
                    </div>

                    <div className="form-group">
                      <label>Probability Weight *</label>
                      <input
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
                    <label>Display Order</label>
                    <input
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
                    <label>Preview</label>
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
      )}

      {/* Server Wipe Tab */}
      {activeTab === 'wipe' && (
        <>
          <div className="admin-section wipe-section">
            <div className="section-header">
              <h2>💀 Server Wipe Configuration</h2>
            </div>

            <div className="wipe-warning">
              <div className="warning-icon">⚠️</div>
              <div className="warning-text">
                <strong>Warning:</strong> Server wipes permanently delete player data. 
                This action cannot be undone. Use with extreme caution.
              </div>
            </div>

            {wipeSettings.last_executed_at && (
              <div className="wipe-last-executed">
                <span>📅 Last wipe executed:</span>
                <strong>{new Date(wipeSettings.last_executed_at).toLocaleString()}</strong>
              </div>
            )}

            <div className="wipe-options">
              <div className="wipe-options-header">
                <h3>📋 Select What to Wipe</h3>
                <label className="wipe-checkbox select-all-checkbox">
                  <input
                    type="checkbox"
                    checked={
                      wipeSettings.wipe_inventory && wipeSettings.wipe_cash && wipeSettings.wipe_bank &&
                      wipeSettings.wipe_level && wipeSettings.wipe_skills && wipeSettings.wipe_businesses &&
                      wipeSettings.wipe_upgrades && wipeSettings.wipe_brothel_workers && wipeSettings.wipe_stocks &&
                      wipeSettings.wipe_addiction && wipeSettings.wipe_health_stamina && wipeSettings.wipe_jail_hospital &&
                      wipeSettings.wipe_pvp_stats && wipeSettings.wipe_casino_history && wipeSettings.wipe_dock_shipments &&
                      wipeSettings.wipe_game_leaderboard
                    }
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setWipeSettings({
                        ...wipeSettings,
                        wipe_inventory: checked,
                        wipe_cash: checked,
                        wipe_bank: checked,
                        wipe_level: checked,
                        wipe_skills: checked,
                        wipe_businesses: checked,
                        wipe_upgrades: checked,
                        wipe_brothel_workers: checked,
                        wipe_stocks: checked,
                        wipe_addiction: checked,
                        wipe_health_stamina: checked,
                        wipe_jail_hospital: checked,
                        wipe_pvp_stats: checked,
                        wipe_casino_history: checked,
                        wipe_dock_shipments: checked,
                        wipe_game_leaderboard: checked
                      });
                    }}
                  />
                  <span className="checkbox-label">
                    <span className="checkbox-icon">✅</span>
                    Select All
                  </span>
                </label>
              </div>
              <div className="wipe-checkboxes">
                <label className="wipe-checkbox">
                  <input
                    type="checkbox"
                    checked={wipeSettings.wipe_inventory}
                    onChange={(e) => setWipeSettings({...wipeSettings, wipe_inventory: e.target.checked})}
                  />
                  <span className="checkbox-label">
                    <span className="checkbox-icon">🎒</span>
                    Player Inventory
                  </span>
                </label>

                <label className="wipe-checkbox">
                  <input
                    type="checkbox"
                    checked={wipeSettings.wipe_cash}
                    onChange={(e) => setWipeSettings({...wipeSettings, wipe_cash: e.target.checked})}
                  />
                  <span className="checkbox-label">
                    <span className="checkbox-icon">💵</span>
                    Cash (Wallet)
                  </span>
                </label>

                <label className="wipe-checkbox">
                  <input
                    type="checkbox"
                    checked={wipeSettings.wipe_bank}
                    onChange={(e) => setWipeSettings({...wipeSettings, wipe_bank: e.target.checked})}
                  />
                  <span className="checkbox-label">
                    <span className="checkbox-icon">🏦</span>
                    Bank Balance
                  </span>
                </label>

                <label className="wipe-checkbox">
                  <input
                    type="checkbox"
                    checked={wipeSettings.wipe_level}
                    onChange={(e) => setWipeSettings({...wipeSettings, wipe_level: e.target.checked})}
                  />
                  <span className="checkbox-label">
                    <span className="checkbox-icon">⭐</span>
                    Level &amp; XP
                  </span>
                </label>

                <label className="wipe-checkbox">
                  <input
                    type="checkbox"
                    checked={wipeSettings.wipe_skills}
                    onChange={(e) => setWipeSettings({...wipeSettings, wipe_skills: e.target.checked})}
                  />
                  <span className="checkbox-label">
                    <span className="checkbox-icon">💪</span>
                    Skills (Power, Defense, Intelligence)
                  </span>
                </label>

                <label className="wipe-checkbox">
                  <input
                    type="checkbox"
                    checked={wipeSettings.wipe_businesses}
                    onChange={(e) => setWipeSettings({...wipeSettings, wipe_businesses: e.target.checked})}
                  />
                  <span className="checkbox-label">
                    <span className="checkbox-icon">🏢</span>
                    Businesses Owned &amp; Upgrades
                  </span>
                </label>

                <label className="wipe-checkbox">
                  <input
                    type="checkbox"
                    checked={wipeSettings.wipe_upgrades}
                    onChange={(e) => setWipeSettings({...wipeSettings, wipe_upgrades: e.target.checked})}
                  />
                  <span className="checkbox-label">
                    <span className="checkbox-icon">📈</span>
                    Business Upgrades Only
                  </span>
                </label>

                <label className="wipe-checkbox">
                  <input
                    type="checkbox"
                    checked={wipeSettings.wipe_brothel_workers}
                    onChange={(e) => setWipeSettings({...wipeSettings, wipe_brothel_workers: e.target.checked})}
                  />
                  <span className="checkbox-label">
                    <span className="checkbox-icon">👯</span>
                    Brothel Workers
                  </span>
                </label>

                <label className="wipe-checkbox">
                  <input
                    type="checkbox"
                    checked={wipeSettings.wipe_stocks}
                    onChange={(e) => setWipeSettings({...wipeSettings, wipe_stocks: e.target.checked})}
                  />
                  <span className="checkbox-label">
                    <span className="checkbox-icon">📊</span>
                    Stock Holdings
                  </span>
                </label>

                <label className="wipe-checkbox">
                  <input
                    type="checkbox"
                    checked={wipeSettings.wipe_addiction}
                    onChange={(e) => setWipeSettings({...wipeSettings, wipe_addiction: e.target.checked})}
                  />
                  <span className="checkbox-label">
                    <span className="checkbox-icon">💊</span>
                    Addiction Level
                  </span>
                </label>

                <label className="wipe-checkbox">
                  <input
                    type="checkbox"
                    checked={wipeSettings.wipe_health_stamina}
                    onChange={(e) => setWipeSettings({...wipeSettings, wipe_health_stamina: e.target.checked})}
                  />
                  <span className="checkbox-label">
                    <span className="checkbox-icon">❤️</span>
                    Reset HP &amp; Stamina
                  </span>
                </label>

                <label className="wipe-checkbox">
                  <input
                    type="checkbox"
                    checked={wipeSettings.wipe_jail_hospital}
                    onChange={(e) => setWipeSettings({...wipeSettings, wipe_jail_hospital: e.target.checked})}
                  />
                  <span className="checkbox-label">
                    <span className="checkbox-icon">🔓</span>
                    Release Jail &amp; Hospital
                  </span>
                </label>

                <label className="wipe-checkbox">
                  <input
                    type="checkbox"
                    checked={wipeSettings.wipe_pvp_stats}
                    onChange={(e) => setWipeSettings({...wipeSettings, wipe_pvp_stats: e.target.checked})}
                  />
                  <span className="checkbox-label">
                    <span className="checkbox-icon">⚔️</span>
                    PVP Stats (Wins/Losses)
                  </span>
                </label>

                <label className="wipe-checkbox">
                  <input
                    type="checkbox"
                    checked={wipeSettings.wipe_casino_history}
                    onChange={(e) => setWipeSettings({...wipeSettings, wipe_casino_history: e.target.checked})}
                  />
                  <span className="checkbox-label">
                    <span className="checkbox-icon">🎰</span>
                    Casino History (Roulette, Blackjack)
                  </span>
                </label>

                <label className="wipe-checkbox">
                  <input
                    type="checkbox"
                    checked={wipeSettings.wipe_dock_shipments}
                    onChange={(e) => setWipeSettings({...wipeSettings, wipe_dock_shipments: e.target.checked})}
                  />
                  <span className="checkbox-label">
                    <span className="checkbox-icon">🚢</span>
                    Dock Shipments &amp; Production
                  </span>
                </label>

                <label className="wipe-checkbox">
                  <input
                    type="checkbox"
                    checked={wipeSettings.wipe_game_leaderboard}
                    onChange={(e) => setWipeSettings({...wipeSettings, wipe_game_leaderboard: e.target.checked})}
                  />
                  <span className="checkbox-label">
                    <span className="checkbox-icon">🏆</span>
                    Game Leaderboard &amp; History
                  </span>
                </label>

                <label className="wipe-checkbox" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <input
                    type="checkbox"
                    checked={wipeSettings.wipe_player_progress}
                    onChange={(e) => setWipeSettings({...wipeSettings, wipe_player_progress: e.target.checked})}
                  />
                  <span className="checkbox-label">
                    <span className="checkbox-icon">📊</span>
                    Full Leaderboard Reset (Level, XP, Cash, Bank, PVP)
                  </span>
                </label>
              </div>
            </div>

            <div className="wipe-schedule">
              <h3>⏰ Schedule Wipe</h3>
              <div className="schedule-controls">
                <div className="form-group">
                  <label>Scheduled Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    value={wipeSettings.scheduled_at}
                    onChange={(e) => setWipeSettings({...wipeSettings, scheduled_at: e.target.value})}
                    className="datetime-input"
                  />
                </div>

                <label className="wipe-checkbox active-toggle">
                  <input
                    type="checkbox"
                    checked={wipeSettings.is_active}
                    onChange={(e) => setWipeSettings({...wipeSettings, is_active: e.target.checked})}
                  />
                  <span className="checkbox-label">
                    <span className="checkbox-icon">{wipeSettings.is_active ? '✅' : '⏸️'}</span>
                    {wipeSettings.is_active ? 'Wipe Countdown Active' : 'Wipe Countdown Paused'}
                  </span>
                </label>
              </div>

              <div className="recurring-section">
                <h4>🔄 Recurring Wipe</h4>
                <div className="recurring-controls">
                  <label className="wipe-checkbox recurring-toggle">
                    <input
                      type="checkbox"
                      checked={wipeSettings.is_recurring}
                      onChange={(e) => setWipeSettings({...wipeSettings, is_recurring: e.target.checked})}
                    />
                    <span className="checkbox-label">
                      <span className="checkbox-icon">{wipeSettings.is_recurring ? '🔁' : '1️⃣'}</span>
                      {wipeSettings.is_recurring ? 'Recurring Enabled' : 'One-Time Wipe'}
                    </span>
                  </label>

                  {wipeSettings.is_recurring && (
                    <div className="form-group recurrence-interval">
                      <label>Repeat Every</label>
                      <div className="interval-input">
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={wipeSettings.recurrence_months}
                          onChange={(e) => setWipeSettings({...wipeSettings, recurrence_months: parseInt(e.target.value) || 3})}
                          className="months-input"
                        />
                        <span className="interval-label">month(s)</span>
                      </div>
                      <small className="interval-note">
                        Next wipe after this one: {wipeSettings.scheduled_at ? 
                          new Date(new Date(wipeSettings.scheduled_at).setMonth(
                            new Date(wipeSettings.scheduled_at).getMonth() + (wipeSettings.recurrence_months || 3)
                          )).toLocaleDateString() : 'Set a date first'}
                      </small>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="wipe-actions">
              <button 
                onClick={saveWipeSettings} 
                className="btn-save wipe-save"
                disabled={wipeSaving}
              >
                {wipeSaving ? '💾 Saving...' : '💾 Save Wipe Settings'}
              </button>

              <ConfirmButton
                onConfirm={executeWipeNow}
                confirmText="⚠️ WIPE ALL?"
                className="btn-delete wipe-execute"
                disabled={wipeSaving || !Object.entries(wipeSettings).some(([key, val]) => key.startsWith('wipe_') && val === true)}
                variant="danger"
              >
                🔥 Execute Wipe Now
              </ConfirmButton>
            </div>

            <div className="wipe-info">
              <h4>ℹ️ How the Wipe System Works</h4>
              <ul>
                <li><strong>Scheduled Wipe:</strong> Set a date/time and enable the countdown. Players will see a countdown timer showing when the wipe occurs.</li>
                <li><strong>Recurring Wipe:</strong> Enable recurring to automatically schedule the next wipe after each one (e.g., every 3 months).</li>
                <li><strong>Manual Wipe:</strong> Use "Execute Wipe Now" to immediately wipe selected data.</li>
                <li><strong>What Gets Wiped:</strong> Only the checked options above will be reset.</li>
                <li><strong>Player Accounts:</strong> User accounts and auth data are never wiped - only game progress.</li>
              </ul>
            </div>
          </div>
        </>
      )}

      {/* Season Pass Management Tab */}
      {activeTab === 'seasonpass' && (
        <SeasonPassAdmin />
      )}

      {/* Guess Balance Management Tab */}
      {activeTab === 'guessbalance' && (
        <>
          <div className="guess-balance-admin-section">
            <div className="section-header">
              <h2>💰 Guess the Balance Sessions</h2>
              <button className="btn-primary" onClick={() => openGuessSessionModal()}>
                + New Session
              </button>
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
                      onClick={() => selectSessionForSlots(session)}
                    >
                      <div className="session-card-header">
                        <h3>{session.title}</h3>
                        <span className={`status-badge ${session.status}`}>
                          {session.status === 'active' ? '🟢 Active' : 
                           session.status === 'completed' ? '✅ Completed' : '❌ Cancelled'}
                        </span>
                      </div>
                      
                      {session.casino_brand && (
                        <div className="casino-info">
                          {session.casino_image_url && (
                            <img src={session.casino_image_url} alt={session.casino_brand} className="casino-logo-small" />
                          )}
                          <span>🏛️ {session.casino_brand}</span>
                        </div>
                      )}

                      <div className="session-stats">
                        <div className="stat">
                          <span className="label">Start:</span>
                          <span className="value">€{parseFloat(session.start_value || 0).toFixed(2)}</span>
                        </div>
                        <div className="stat">
                          <span className="label">Expended:</span>
                          <span className="value">€{parseFloat(session.amount_expended || 0).toFixed(2)}</span>
                        </div>
                        <div className="stat">
                          <span className="label">BE x:</span>
                          <span className="value">{session.be_multiplier || 1.0}x</span>
                        </div>
                        {session.final_balance !== null && (
                          <div className="stat highlight">
                            <span className="label">Final:</span>
                            <span className="value">€{parseFloat(session.final_balance || 0).toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      <div className="session-flags">
                        <span className={`flag ${session.is_guessing_open ? 'active' : ''}`}>
                          {session.is_guessing_open ? '✅ Guessing Open' : '⏸️ Guessing Closed'}
                        </span>
                        <span className={`flag ${session.reveal_answer ? 'revealed' : ''}`}>
                          {session.reveal_answer ? '👁️ Answer Revealed' : '🔒 Hidden'}
                        </span>
                      </div>

                      <div className="session-actions">
                        <button className="btn-edit" onClick={(e) => { e.stopPropagation(); openGuessSessionModal(session); }}>
                          ✏️ Edit
                        </button>
                        <button 
                          className="btn-results" 
                          onClick={(e) => { e.stopPropagation(); openSlotResultsModal(session); }}
                        >
                          🎯 Enter Results
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
                            <span>Bet: €{parseFloat(slot.bet_value || 0).toFixed(2)}</span>
                            {slot.is_super && <span className="super-tag">⭐ SUPER</span>}
                          </div>
                          {slot.bonus_win !== null && (
                            <div className="slot-results">
                              <span>Win: €{parseFloat(slot.bonus_win || 0).toFixed(2)}</span>
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
                  <div className="form-row">
                    <div className="form-group">
                      <label>Title *</label>
                      <input
                        type="text"
                        value={guessSessionFormData.title}
                        onChange={(e) => setGuessSessionFormData({...guessSessionFormData, title: e.target.value})}
                        placeholder="e.g., Guess the Balance #1"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select
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
                    <label>Description</label>
                    <textarea
                      value={guessSessionFormData.description}
                      onChange={(e) => setGuessSessionFormData({...guessSessionFormData, description: e.target.value})}
                      placeholder="Optional description..."
                      rows={2}
                    />
                  </div>

                  <div className="form-section-title">💵 Money Settings</div>
                  <div className="form-row four-cols">
                    <div className="form-group">
                      <label>Start Value (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={guessSessionFormData.start_value}
                        onChange={(e) => setGuessSessionFormData({...guessSessionFormData, start_value: e.target.value})}
                        placeholder="1000.00"
                      />
                    </div>
                    <div className="form-group">
                      <label>Amount Expended (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={guessSessionFormData.amount_expended}
                        onChange={(e) => setGuessSessionFormData({...guessSessionFormData, amount_expended: e.target.value})}
                        placeholder="500.00"
                      />
                      <small>Auto-calculated from slots</small>
                    </div>
                    <div className="form-group">
                      <label>BE Multiplier (x)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={guessSessionFormData.be_multiplier}
                        onChange={(e) => setGuessSessionFormData({...guessSessionFormData, be_multiplier: e.target.value})}
                        placeholder="1.0"
                      />
                    </div>
                    <div className="form-group">
                      <label>Final Balance (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={guessSessionFormData.final_balance}
                        onChange={(e) => setGuessSessionFormData({...guessSessionFormData, final_balance: e.target.value})}
                        placeholder="Leave empty until end"
                      />
                      <small>Set when session ends</small>
                    </div>
                  </div>

                  <div className="form-section-title">🏛️ Casino Info</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Casino Brand</label>
                      <input
                        type="text"
                        value={guessSessionFormData.casino_brand}
                        onChange={(e) => setGuessSessionFormData({...guessSessionFormData, casino_brand: e.target.value})}
                        placeholder="e.g., Stake, Rollbit..."
                      />
                    </div>
                    <div className="form-group">
                      <label>Casino Logo URL</label>
                      <input
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
                        <label>Search Slots</label>
                        <input
                          type="text"
                          value={slotSearchQuery}
                          onChange={(e) => setSlotSearchQuery(e.target.value)}
                          placeholder="Type to search slots..."
                          className="slot-search-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Bet Value (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newSlotBetValue}
                          onChange={(e) => setNewSlotBetValue(parseFloat(e.target.value) || 0)}
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
                              <div 
                                key={slot.id} 
                                className="slot-catalog-item"
                                onClick={() => addSlotToSession(slot)}
                              >
                                <img src={slot.image} alt={slot.name} className="slot-catalog-image" />
                                <div className="slot-catalog-info">
                                  <span className="slot-catalog-name">{slot.name}</span>
                                  <span className="slot-catalog-provider">{slot.provider}</span>
                                </div>
                                <button type="button" className="add-slot-btn">+</button>
                              </div>
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
                      <span className="total-bets">Total Bets: €{sessionSlotsInModal.reduce((sum, s) => sum + (parseFloat(s.bet_value) || 0), 0).toFixed(2)}</span>
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
                            <span className="added-slot-bet">€{parseFloat(slot.bet_value || 0).toFixed(2)}</span>
                            {slot.is_super && <span className="super-badge">⭐</span>}
                            <button 
                              type="button" 
                              className="remove-slot-btn"
                              onClick={() => removeSlotFromSession(index)}
                            >
                              ×
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
                      <label>Slot Name *</label>
                      <input
                        type="text"
                        value={slotFormData.slot_name}
                        onChange={(e) => setSlotFormData({...slotFormData, slot_name: e.target.value})}
                        placeholder="e.g., Gates of Olympus"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Provider</label>
                      <input
                        type="text"
                        value={slotFormData.provider}
                        onChange={(e) => setSlotFormData({...slotFormData, provider: e.target.value})}
                        placeholder="e.g., Pragmatic Play"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Slot Image URL</label>
                    <input
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
                      <label>Bet Value (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={slotFormData.bet_value}
                        onChange={(e) => setSlotFormData({...slotFormData, bet_value: e.target.value})}
                        placeholder="1.00"
                      />
                    </div>
                    <div className="form-group">
                      <label>Display Order</label>
                      <input
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
                      <label>Bonus Win (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={slotFormData.bonus_win}
                        onChange={(e) => setSlotFormData({...slotFormData, bonus_win: e.target.value})}
                        placeholder="Leave empty until opened"
                      />
                    </div>
                    <div className="form-group">
                      <label>Multiplier (x)</label>
                      <input
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
                            <label>💰 Bonus Win (€)</label>
                            <input
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
                              placeholder="Enter win amount..."
                              autoFocus
                            />
                          </div>
                          <div className="input-group">
                            <label>📊 Multiplier (x)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={currentSlot.multiplier || ''}
                              onChange={(e) => {
                                const updatedSlots = [...guessBalanceSlots];
                                updatedSlots[currentSlotIndex] = {
                                  ...currentSlot,
                                  multiplier: e.target.value
                                };
                                setGuessBalanceSlots(updatedSlots);
                              }}
                              placeholder="e.g., 150"
                            />
                          </div>
                          {currentSlot.bet_value && currentSlot.bonus_win && (
                            <div className="auto-multiplier">
                              Auto calc: {(parseFloat(currentSlot.bonus_win) / parseFloat(currentSlot.bet_value)).toFixed(2)}x
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
                          key={idx}
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
        </>
      )}
    </div>
  );
}
