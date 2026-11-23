/* AG_PROFILE_SIDEBAR_BRIDGE_START v1.0.0 / Antigravity 2.34.0 */
class AGProfileSidebarBoundary extends E.Component {
  constructor(props) { super(props); this.state={failed:false}; }
  static getDerivedStateFromError() { return {failed:true}; }
  componentDidCatch() { console.warn('[profile-sidebar] Native integration is unavailable; the original sidebar remains active.'); }
  render() { return this.state.failed ? null : this.props.children; }
}
function AGProfileSidebarSlot() {
  var profileStatus=el(sB), profileAuth=el(Xk), profilePlugins=p6().installedPlugins;
  var profileViews=ABc(K.SidecarUIEntrypoint.SIDECAR_UI_ENTRYPOINT_AUX_PANE);
  var profileOpenSidecar=KBc(), profileSettings=C_(), profileServices=sd(), profileHost=Nj(), profileBrowser=qK();
  var profileExtension=window.__AGProfileSidebar;
  if (!profileExtension || !profileExtension.isPluginEnabled(profilePlugins,'profile-sidebar')) return null;
  var profileAccountsView=profileViews.find(function(view){return view.sidecarId==='account-switcher/accounts' && view.path==='/';});
  var profileCanLogout=profileAuth?.state==='signedIn' && !profileStatus?.isAdc && !profileHost.get('isRemoteControl') && typeof profileServices.core.authService.logout==='function';
  return E.createElement(profileExtension.Component,{
    React:E, portal:zy.createPortal, status:profileStatus, auth:profileAuth,
    accountsEnabled:profileExtension.isPluginEnabled(profilePlugins,'account-switcher'), accountsReady:!!profileAccountsView,
    canLogout:profileCanLogout,
    onSettings:function(){profileSettings({targetScreen:'General'});},
    onAccount:function(){profileSettings({targetScreen:'Account'});},
    onUpgrade:function(url){return profileBrowser.openUrlInSystemBrowser(url);},
    onLogout:function(){return profileServices.core.authService.logout();},
    onAccounts:function(intent){
      if(!profileAccountsView) throw new Error('Accounts panel is unavailable.');
      profileOpenSidecar(profileAccountsView,{accountAction:intent==='add'?'add':'switch'});
    }
  });
}
/* AG_PROFILE_SIDEBAR_BRIDGE_END */
