/* eslint-disable  @typescript-eslint/ban-ts-ignore */
import _ from "lodash";
import { put, debounce, takeEvery, all } from "redux-saga/effects";
import { ReduxAction, ReduxActionTypes } from "constants/ReduxActionConstants";

const BATCH_PRIORITY = {
  [ReduxActionTypes.SET_META_PROP]: {
    priority: 0,
    needsSaga: false,
  },
  [ReduxActionTypes.RESET_WIDGET_META]: {
    priority: 0,
    needsSaga: false,
  },
  [ReduxActionTypes.UPDATE_WIDGET_PROPERTY]: {
    priority: 0,
    needsSaga: false,
  },
  [ReduxActionTypes.EXECUTE_ACTION]: {
    priority: 1,
    needsSaga: true,
  },
  [ReduxActionTypes.EXECUTE_PAGE_LOAD_ACTIONS]: {
    priority: 1,
    needsSaga: true,
  },
  [ReduxActionTypes.UPDATE_ACTION_PROPERTY]: {
    priority: 0,
    needsSaga: false,
  },
  [ReduxActionTypes.UPDATE_ACTION_INIT]: {
    priority: 1,
    needsSaga: true,
  },
};

const batchPriorityMap: Map<number, ReduxAction<any>[]> = new Map();

function* storeUpdatesSaga(action: ReduxAction<ReduxAction<any>>) {
  try {
    const priority = BATCH_PRIORITY[action.payload.type].priority;
    const currentPriorityBatchs = batchPriorityMap.get(priority) || [];
    currentPriorityBatchs.push(action.payload);
    batchPriorityMap.set(priority, currentPriorityBatchs);
    if (currentPriorityBatchs.length === 0) {
      yield put({ type: ReduxActionTypes.EXECUTE_BATCH });
    }
  } catch (e) {
    console.error(`${action.payload.type} action priority not set`);
  }
}

function* executeBatchSaga() {
  for (let priority = 0; priority < batchPriorityMap.size; priority++) {
    const batch = batchPriorityMap.get(priority);
    if (Array.isArray(batch) && batch.length) {
      const needsSaga = batch.filter(b => BATCH_PRIORITY[b.type].needsSaga);
      const canBatch = batch.filter(b => !BATCH_PRIORITY[b.type].needsSaga);
      batchPriorityMap.set(priority, []);
      // @ts-ignore
      yield put(canBatch);
      if (needsSaga.length) {
        for (const sagaAction of needsSaga) {
          yield put(sagaAction);
        }
      }
    }
  }
}

export default function* root() {
  yield all([
    debounce(60, ReduxActionTypes.EXECUTE_BATCH, executeBatchSaga),
    takeEvery(ReduxActionTypes.BATCHED_UPDATE, storeUpdatesSaga),
  ]);
}
