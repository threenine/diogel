<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { QTableColumn } from 'quasar';
import { logService } from '../services/log-service';
import type { ApprovalLog, ExceptionLog } from '../services/database';
import useAccountStore from '../stores/account-store';

const { t } = useI18n();
const accountStore = useAccountStore();
const tab = ref('approvals');
const approvals = ref<ApprovalLog[]>([]);
const exceptions = ref<ExceptionLog[]>([]);

const fetchLogs = async () => {
  approvals.value = await logService.getApprovals(accountStore.activeKey);
  exceptions.value = await logService.getExceptions(accountStore.activeKey);
};

onMounted(fetchLogs);

watch(() => accountStore.activeKey, fetchLogs);

const approvalColumns = computed<QTableColumn[]>(() => [
  {
    name: 'dateTime',
    label: t('logs.columns.dateTime'),
    field: 'dateTime',
    align: 'left',
    sortable: true,
  },
  {
    name: 'eventKind',
    label: t('logs.columns.eventKind'),
    field: 'eventKind',
    align: 'left',
    sortable: true,
  },
  {
    name: 'hostname',
    label: t('logs.columns.hostname'),
    field: 'hostname',
    align: 'left',
    sortable: true,
  },
]);

const exceptionColumns = computed<QTableColumn[]>(() => [
  {
    name: 'dateTime',
    label: t('logs.columns.dateTime'),
    field: 'dateTime',
    align: 'left',
    sortable: true,
  },
  {
    name: 'dateTime',
    label: t('logs.columns.hostname'),
    field: 'message',
    align: 'left',
    sortable: true,
  },
  {
    name: 'message',
    label: t('logs.columns.message'),
    field: 'message',
    align: 'left',
    sortable: true },
]);

const formatDateTime = (val: string) => {
  try {
    return new Date(val).toLocaleString();
  } catch {
    return val;
  }
};
</script>

<template>
  <q-page padding>
    <div class="q-mb-md flex justify-between items-center">
      <div class="text-h6">{{ t('logs.title') }}</div>
      <q-btn flat round icon="refresh" @click="fetchLogs" />
    </div>

    <q-tabs
      v-model="tab"
      dense
      class="text-grey"
      active-color="primary"
      indicator-color="primary"
      align="justify"
      narrow-indicator
    >
      <q-tab name="approvals" :label="t('logs.tabs.approvals')" />
      <q-tab name="exceptions" :label="t('logs.tabs.exceptions')" />
    </q-tabs>

    <q-separator />

    <q-tab-panels v-model="tab" animated>
      <q-tab-panel name="approvals" class="q-pa-none">
        <q-table
          :rows="approvals"
          :columns="approvalColumns"
          row-key="id"
          flat
          bordered
          :no-data-label="t('logs.noData')"
          :pagination="{ rowsPerPage: 10 }"
        >
          <template v-slot:body-cell-dateTime="props">
            <q-td :props="props">
              {{ formatDateTime(props.value) }}
            </q-td>
          </template>
        </q-table>
      </q-tab-panel>

      <q-tab-panel name="exceptions" class="q-pa-none">
        <q-table
          :rows="exceptions"
          :columns="exceptionColumns"
          row-key="id"
          flat
          bordered
          :no-data-label="t('logs.noData')"
          :pagination="{ rowsPerPage: 10 }"
        >
          <template v-slot:body-cell-dateTime="props">
            <q-td :props="props">
              {{ formatDateTime(props.value) }}
            </q-td>
          </template>
          <template v-slot:body-cell-message="props">
            <q-td
              :props="props"
              class="text-wrap"
              style="word-break: break-all; white-space: normal"
            >
              {{ props.value }}
            </q-td>
          </template>
        </q-table>
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<style scoped>
.text-wrap {
  max-width: 400px;
}
</style>
