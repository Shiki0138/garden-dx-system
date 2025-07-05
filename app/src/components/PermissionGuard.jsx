/**
 * Garden 造園業向け統合業務管理システム
 * 権限ベースUI制御コンポーネント
 * Worker4 RBAC統合対応
 */

import React from 'react';
import PropTypes from 'prop-types';
import authService from '../services/authService';

/**
 * 権限ベースガードコンポーネント
 * 指定された権限がない場合は子要素を非表示にする
 */
const PermissionGuard = ({
  children,
  resource,
  action,
  feature,
  role,
  fallback = null,
  showFallback = false,
}) => {
  // 認証チェック
  if (!authService.isAuthenticated()) {
    return showFallback ? fallback : null;
  }

  // 機能フラグチェック
  if (feature && !authService.hasFeature(feature)) {
    return showFallback ? fallback : null;
  }

  // ロールチェック
  if (role) {
    const currentUser = authService.getCurrentUser();
    if (currentUser?.role !== role) {
      return showFallback ? fallback : null;
    }
  }

  // リソース・アクション権限チェック（非同期のため、楽観的表示）
  // 実際の権限チェックはAPIレベルで行われる
  if (resource && action) {
    // キャッシュされた機能情報から判断
    const features = authService.getUserFeatures();
    if (!features) {
      return showFallback ? fallback : null;
    }
  }

  return children;
};

PermissionGuard.propTypes = {
  children: PropTypes.node.isRequired,
  resource: PropTypes.string,
  action: PropTypes.string,
  feature: PropTypes.string,
  role: PropTypes.oneOf(['owner', 'employee']),
  fallback: PropTypes.node,
  showFallback: PropTypes.bool,
};

/**
 * 経営者専用ガード
 */
export const OwnerOnly = ({ children, fallback = null, showFallback = false }) => (
  <PermissionGuard role="owner" fallback={fallback} showFallback={showFallback}>
    {children}
  </PermissionGuard>
);

OwnerOnly.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
  showFallback: PropTypes.bool,
};

/**
 * 従業員以上ガード
 */
export const EmployeeAndAbove = ({ children, fallback = null, showFallback = false }) => (
  <PermissionGuard role="employee" fallback={fallback} showFallback={showFallback}>
    {children}
  </PermissionGuard>
);

EmployeeAndAbove.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
  showFallback: PropTypes.bool,
};

/**
 * 原価表示権限ガード
 */
export const CostViewGuard = ({ children, fallback = null, showFallback = false }) => (
  <PermissionGuard feature="can_view_costs" fallback={fallback} showFallback={showFallback}>
    {children}
  </PermissionGuard>
);

CostViewGuard.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
  showFallback: PropTypes.bool,
};

/**
 * 利益表示権限ガード
 */
export const ProfitViewGuard = ({ children, fallback = null, showFallback = false }) => (
  <PermissionGuard feature="can_view_profits" fallback={fallback} showFallback={showFallback}>
    {children}
  </PermissionGuard>
);

ProfitViewGuard.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
  showFallback: PropTypes.bool,
};

/**
 * 金額調整権限ガード
 */
export const AdjustTotalGuard = ({ children, fallback = null, showFallback = false }) => (
  <PermissionGuard feature="can_adjust_total" fallback={fallback} showFallback={showFallback}>
    {children}
  </PermissionGuard>
);

AdjustTotalGuard.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
  showFallback: PropTypes.bool,
};

/**
 * 請求書発行権限ガード
 */
export const InvoiceIssueGuard = ({ children, fallback = null, showFallback = false }) => (
  <PermissionGuard feature="can_issue_invoices" fallback={fallback} showFallback={showFallback}>
    {children}
  </PermissionGuard>
);

InvoiceIssueGuard.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
  showFallback: PropTypes.bool,
};

/**
 * ダッシュボード表示権限ガード
 */
export const DashboardGuard = ({ children, fallback = null, showFallback = false }) => (
  <PermissionGuard feature="can_view_dashboard" fallback={fallback} showFallback={showFallback}>
    {children}
  </PermissionGuard>
);

DashboardGuard.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
  showFallback: PropTypes.bool,
};

/**
 * ユーザー管理権限ガード
 */
export const UserManagementGuard = ({ children, fallback = null, showFallback = false }) => (
  <PermissionGuard feature="can_manage_users" fallback={fallback} showFallback={showFallback}>
    {children}
  </PermissionGuard>
);

UserManagementGuard.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
  showFallback: PropTypes.bool,
};

export default PermissionGuard;
