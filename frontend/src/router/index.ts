import { defineRouter } from '#q-app';
import { routes, handleHotUpdate } from 'vue-router/auto-routes';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
// import { useAuthStore } from '@/stores/auth';
// import { onUnauthorized } from '@/utils/api';

// function isAdminPath(path: string) {
//   return path === '/admin' || path.startsWith('/admin/');
// }

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter((/* { store, ssrContext } */) => {
  const createHistory = import.meta.env.QUASAR_SERVER
    ? createMemoryHistory
    : import.meta.env.QUASAR_VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE),
  });

  // Router.beforeEach(async (to) => {
  //   const auth = useAuthStore();
  //
  //   // On first load, ask the back who is logged in
  //   if (!auth.initialized) {
  //     await auth.fetchCurrentUser();
  //   }
  //
  //   const isPublic = PUBLIC_PATHS.includes(to.path);
  //
  //   if (!auth.isLoggedIn && !isPublic) {
  //     return '/login';
  //   }
  //
  //   if (auth.isLoggedIn && isPublic) {
  //     return '/';
  //   }
  //
  //   if (isAdminPath(to.path) && !auth.isAdmin) {
  //     return '/';
  //   }
  // });
  //
  // onUnauthorized(() => {
  //   useAuthStore().forgetUser();
  //   void Router.push('/login');
  // });

  // enable HMR for it
  if (import.meta.hot) {
    handleHotUpdate(Router);
  }

  return Router;
});
