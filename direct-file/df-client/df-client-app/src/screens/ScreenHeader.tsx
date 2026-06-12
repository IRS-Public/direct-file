import { Breadcrumb, BreadcrumbBar, Button, Icon } from '@trussworks/react-uswds';
import { useFlow } from '../flow/flowConfig.js';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFactGraph } from '../factgraph/FactGraphContext.js';
import { getCollectionId } from './BaseScreen.js';
import { ScreenConfig } from '../flow/ScreenConfig.js';
import { useMemo } from 'react';
import { setSmoothScroll } from '../misc/misc.js';

export const BackButton = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <Button
      type='button'
      className='screen__back-button'
      unstyled
      onChange={(evt: any) => {
        evt.preventDefault();
        // @ts-expect-error react navigation type is not defined correctly
        navigate(-1, { preventScrollReset: true });
        // Removes smooth scrolling when exiting page with errors
        setSmoothScroll(false);
      }}
    >
      <Icon.ArrowBack aria-hidden />
      <span className='margin-left-05'>{t(`screen.linkToPrevious`)}</span>
    </Button>
  );
};

export function ScreenHeader() {
  const flowConfig = useFlow();
  const firstRoute = flowConfig.screens[0].screenRoute;
  const params = useParams();
  const flow = useFlow();
  const currentUrl = `/flow/${params[`*`]}`;
  const { t, i18n } = useTranslation();

  const screenInfo = flowConfig.screensByRoute.get(currentUrl);
  const subcategoryRoute = screenInfo?.subcategoryRoute;
  const thisRoute = screenInfo?.route;
  const { factGraph } = useFactGraph();
  const [searchParams] = useSearchParams();

  // The collection id for this screen (from the params)
  const collectionId = getCollectionId(factGraph, searchParams, screenInfo?.collectionContext);

  const hideBreadcrumbScreens = useMemo(() => flow.screens.filter((screen) => screen.hideBreadcrumbs), [flow]).map(
    (obj) => obj.route
  );
  const hideScreenHeader = hideBreadcrumbScreens.includes(`${thisRoute}`);

  // Search the subcategory of the current screen to find the first screen of the subcategory,
  // or the dataview screen.
  const findDataViewOrIntroRoute = (screensByRoute: Map<string, ScreenConfig>, subcategoryRoute: string) => {
    const subcategory = flowConfig.subcategoriesByRoute.get(subcategoryRoute);

    // If this subcategory has a dataview override, return its link
    const dataViewOverrideScreen = subcategory?.screens
      .filter((s) => s.actAsDataView)
      .find((s) => s.isAvailable(factGraph, collectionId));
    if (dataViewOverrideScreen) {
      return dataViewOverrideScreen.fullRoute(null);
    }

    // If this subcategory has a dataview screen, return its link
    if (subcategory && subcategory.hasDataView) {
      return `/data-view/${subcategory.route}`;
    }

    // Otherwise return the first available screen whose route starts with the subcategory route
    for (const [route, screen] of screensByRoute.entries()) {
      if (route.startsWith(subcategoryRoute) && screen.isAvailable(factGraph, collectionId)) {
        return route;
      }
    }

    return firstRoute; // Return first route if no matching key is found
  };

  // Data views and knockouts may not have an intro route, so we only display this when one exists.
  const SubCategoryBreadcrumb = () => {
    // Find a link to the dataview or first screen in a subcategory
    const subcategoryLink = subcategoryRoute
      ? findDataViewOrIntroRoute(flowConfig.screensByRoute, subcategoryRoute)
      : firstRoute;
    // Get a heading for it
    const introRouteKey = `checklist.${subcategoryRoute}.heading`;
    const handleClick = () => {
      // Removes smooth scroll settings when exiting flow pages
      setSmoothScroll(false);
    };
    return currentUrl === subcategoryLink || !i18n.exists(introRouteKey) || !subcategoryLink ? (
      <></>
    ) : (
      <Breadcrumb>
        <Link to={subcategoryLink} className='usa-breadcrumb__link' onClick={handleClick}>
          <span>{t(introRouteKey)}</span>
        </Link>
      </Breadcrumb>
    );
  };

  if (hideScreenHeader) {
    return;
  } else {
    return (
      <>
        <BreadcrumbBar className='screen__breadcrumbs' variant='wrap'>
          <Breadcrumb>
            <Link to='/checklist' className='usa-breadcrumb__link'>
              <span>{t(`screen.linkToChecklist`)}</span>
            </Link>
          </Breadcrumb>
          <SubCategoryBreadcrumb />
        </BreadcrumbBar>
        <BackButton />
      </>
    );
  }
}
