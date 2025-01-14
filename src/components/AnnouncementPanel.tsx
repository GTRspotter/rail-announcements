import React, { useCallback, useEffect, useState } from 'react'

import { makeStyles } from '@material-ui/styles'
import Tabs from './Tabs'
import getActiveSystem from '@helpers/getActiveSystem'
import AnnouncementTabErrorBoundary from './AnnouncementTabErrorBoundary'

import { useRecoilState } from 'recoil'
import { selectedTabIdsState } from '@atoms'
import { IPersonalPresetObject, deletePersonalPreset, getPersonalPresets, initPersonalPresetsDb, savePersonalPreset } from '@data/db'

import * as Sentry from '@sentry/gatsby'

const useStyles = makeStyles({
  root: {
    padding: 16,
    backgroundColor: '#eee',
    marginTop: 24,
  },
  heading: {
    marginBottom: 16,
  },
  instanceHeader: {
    marginBottom: 16,
  },
})

function AnnouncementPanel() {
  const classes = useStyles()
  const AnnouncementSystem = getActiveSystem()

  const [isPresetsDbReady, setIsPresetsDbReady] = useState<boolean>(false)

  if (typeof window !== 'undefined') {
    window.__system = AnnouncementSystem
  }

  const AnnouncementSystemInstance = AnnouncementSystem ? new AnnouncementSystem() : null
  const customTabs = AnnouncementSystemInstance?.customAnnouncementTabs ?? {}

  const TabPanelMap = React.useMemo(
    () =>
      !AnnouncementSystem || !AnnouncementSystemInstance
        ? null
        : Object.entries(customTabs).reduce(
            (acc, [id, { component: TabComponent, ...opts }], i) => {
              acc[opts.name] = (
                <AnnouncementTabErrorBoundary
                  key={opts.name}
                  systemId={AnnouncementSystemInstance.ID}
                  systemName={AnnouncementSystemInstance.NAME}
                >
                  <TabComponent
                    {...opts.props}
                    name={opts.name}
                    tabId={id}
                    systemId={AnnouncementSystemInstance.ID}
                    isPersonalPresetsReady={isPresetsDbReady}
                    savePersonalPreset={savePersonalPreset}
                    getPersonalPresets={getPersonalPresets}
                    deletePersonalPreset={deletePersonalPreset}
                  />
                </AnnouncementTabErrorBoundary>
              )

              return acc
            },
            {} as Record<string, React.ReactElement>,
          ),
    [customTabs, AnnouncementSystem, AnnouncementSystemInstance, isPresetsDbReady, savePersonalPreset, getPersonalPresets],
  )
  const TabPanels: React.ReactElement[] = Object.values(TabPanelMap ?? {})

  const [selectedTabIds, setSelectedTabIds] = useRecoilState(selectedTabIdsState)

  function getSelectedTab() {
    const tabId = selectedTabIds?.[AnnouncementSystemInstance?.ID ?? '']

    if (tabId) {
      const index = Object.keys(customTabs).findIndex(tab => tab === tabId)

      if (index !== -1) {
        return index
      }
    }

    return 0
  }

  const setSelectedTab = useCallback(
    (index: number) => {
      const tabId = Object.keys(customTabs)[index]

      setSelectedTabIds(prevState => ({
        ...(prevState || {}),
        [AnnouncementSystemInstance?.ID ?? '']: tabId,
      }))
    },
    [setSelectedTabIds, AnnouncementSystemInstance, customTabs],
  )

  async function initialisePresetsDb() {
    try {
      const status = await initPersonalPresetsDb()

      if (status) {
        setIsPresetsDbReady(true)
      }
    } catch (e) {
      console.log('Failed to initialise personal presets database', e)
      Sentry.captureException(e)
    }
  }

  useEffect(() => {
    if (!isPresetsDbReady) {
      initialisePresetsDb()
    }
  }, [isPresetsDbReady])

  if (!AnnouncementSystem) return null

  return (
    <div className={classes.root}>
      <h2 className={classes.heading}>{AnnouncementSystemInstance?.NAME}</h2>

      <div className={classes.instanceHeader}>{AnnouncementSystemInstance?.headerComponent()}</div>

      <Tabs
        selectedTabIndex={getSelectedTab()}
        onTabChange={setSelectedTab}
        tabNames={Object.values(customTabs).map(tab => tab.name)}
        tabItems={TabPanels ?? []}
        customKeyPrefix={AnnouncementSystemInstance?.ID}
      />
    </div>
  )
}

export default AnnouncementPanel
