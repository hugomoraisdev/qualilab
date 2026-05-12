import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Pré-carrega a rota ao passar o mouse / tocar no link (~50ms antes do clique).
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
    // Mantém o chunk e os dados quentes por 30s para navegação ida-e-volta instantânea.
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
