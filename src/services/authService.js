/**
 * Garden 造園業向け統合業務管理システム
 * 認証・権限管理サービス（フロントエンド）
 * Worker4 RBAC統合対応 - 企業級型安全性・パフォーマンス最適化
 * @version 1.0.0
 * @author Garden DX Team
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/**
 * 認証・権限管理サービスクラス（企業級実装）
 * JWT認証、RBAC権限管理、パフォーマンス最適化対応
 */
class AuthService {
  constructor() {
    this.token = localStorage.getItem('garden_auth_token');
    this.userFeatures = null;
    this.refreshPromise = null;
    this.setupAxiosInterceptors();
  }

  /**
   * Axiosインターセプター設定
   */
  setupAxiosInterceptors() {
    // リクエストインターセプター（認証トークン付与）
    axios.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // レスポンスインターセプター（認証エラー処理）
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * ログイン
   * @param {string} username - ユーザー名
   * @param {string} password - パスワード
   * @returns {Promise<Object>} ログイン結果
   */
  async login(username, password) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        username,
        password
      });

      const { access_token, user } = response.data;
      
      this.token = access_token;
      localStorage.setItem('garden_auth_token', access_token);
      localStorage.setItem('garden_user', JSON.stringify(user));

      // ユーザー機能情報取得
      await this.loadUserFeatures();

      return {
        success: true,
        user,
        token: access_token
      };

    } catch (error) {
      console.error('ログインエラー:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'ログインに失敗しました'
      };
    }
  }

  /**
   * ログアウト
   */
  logout() {
    this.token = null;
    this.userFeatures = null;
    localStorage.removeItem('garden_auth_token');
    localStorage.removeItem('garden_user');
    localStorage.removeItem('garden_user_features');
  }

  /**
   * 現在のログイン状態確認
   * @returns {boolean} ログイン中かどうか
   */
  isAuthenticated() {
    return Boolean(this.token);
  }

  /**
   * 現在ユーザー情報取得
   * @returns {Object|null} ユーザー情報
   */
  getCurrentUser() {
    const userStr = localStorage.getItem('garden_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * ユーザー機能情報読み込み
   * @returns {Promise<Object>} 機能情報
   */
  async loadUserFeatures() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/user-features`);
      
      this.userFeatures = response.data;
      localStorage.setItem('garden_user_features', JSON.stringify(this.userFeatures));
      
      return this.userFeatures;

    } catch (error) {
      console.error('ユーザー機能情報取得エラー:', error);
      return null;
    }
  }

  /**
   * ユーザー機能情報取得
   * @returns {Object|null} 機能情報
   */
  getUserFeatures() {
    if (this.userFeatures) {
      return this.userFeatures;
    }

    const featuresStr = localStorage.getItem('garden_user_features');
    if (featuresStr) {
      this.userFeatures = JSON.parse(featuresStr);
      return this.userFeatures;
    }

    return null;
  }

  /**
   * 権限チェック（特定リソース・アクション）
   * @param {string} resource - リソース名
   * @param {string} action - アクション名
   * @returns {Promise<boolean>} 権限があるかどうか
   */
  async checkPermission(resource, action) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/auth/check-permission/${resource}/${action}`
      );
      
      return response.data.has_permission;

    } catch (error) {
      console.error('権限チェックエラー:', error);
      return false;
    }
  }

  /**
   * 機能フラグチェック（キャッシュ使用）
   * @param {string} featureName - 機能名
   * @returns {boolean} 機能が利用可能かどうか
   */
  hasFeature(featureName) {
    const features = this.getUserFeatures();
    return features?.features?.[featureName] || false;
  }

  /**
   * 経営者権限チェック
   * @returns {boolean} 経営者かどうか
   */
  isOwner() {
    const user = this.getCurrentUser();
    return user?.role === 'owner';
  }

  /**
   * 従業員権限チェック
   * @returns {boolean} 従業員かどうか
   */
  isEmployee() {
    const user = this.getCurrentUser();
    return user?.role === 'employee';
  }

  /**
   * 原価情報表示権限チェック
   * @returns {boolean} 原価が見えるかどうか
   */
  canViewCosts() {
    return this.hasFeature('can_view_costs');
  }

  /**
   * 利益情報表示権限チェック
   * @returns {boolean} 利益が見えるかどうか
   */
  canViewProfits() {
    return this.hasFeature('can_view_profits');
  }

  /**
   * 金額調整権限チェック
   * @returns {boolean} 金額調整ができるかどうか
   */
  canAdjustTotal() {
    return this.hasFeature('can_adjust_total');
  }

  /**
   * 見積承認権限チェック
   * @returns {boolean} 見積承認ができるかどうか
   */
  canApproveEstimates() {
    return this.hasFeature('can_approve_estimates');
  }

  /**
   * 請求書発行権限チェック
   * @returns {boolean} 請求書発行ができるかどうか
   */
  canIssueInvoices() {
    return this.hasFeature('can_issue_invoices');
  }

  /**
   * ユーザー管理権限チェック
   * @returns {boolean} ユーザー管理ができるかどうか
   */
  canManageUsers() {
    return this.hasFeature('can_manage_users');
  }

  /**
   * ダッシュボード表示権限チェック
   * @returns {boolean} ダッシュボードが見えるかどうか
   */
  canViewDashboard() {
    return this.hasFeature('can_view_dashboard');
  }

  /**
   * 権限マトリックス取得（経営者のみ）
   * @returns {Promise<Object>} 権限マトリックス
   */
  async getPermissionMatrix() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/permission-matrix`);
      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      console.error('権限マトリックス取得エラー:', error);
      return {
        success: false,
        error: error.response?.data?.detail || '権限マトリックスの取得に失敗しました'
      };
    }
  }

  /**
   * 表示用ロール名取得
   * @returns {string} 表示用ロール名
   */
  getRoleDisplayName() {
    const features = this.getUserFeatures();
    return features?.features?.role_display || '未設定';
  }

  /**
   * デバッグ用権限情報表示
   * @returns {Object} デバッグ情報
   */
  getDebugInfo() {
    return {
      isAuthenticated: this.isAuthenticated(),
      user: this.getCurrentUser(),
      features: this.getUserFeatures(),
      permissions: {
        canViewCosts: this.canViewCosts(),
        canViewProfits: this.canViewProfits(),
        canAdjustTotal: this.canAdjustTotal(),
        canApproveEstimates: this.canApproveEstimates(),
        canIssueInvoices: this.canIssueInvoices(),
        canManageUsers: this.canManageUsers(),
        canViewDashboard: this.canViewDashboard()
      }
    };
  }
}

// シングルトンインスタンス
const authService = new AuthService();

export default authService;