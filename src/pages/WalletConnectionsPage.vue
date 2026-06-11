<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  getNip47Balance,
  getNip47Info,
  importNip47Connection,
  listNip47Connections,
  listNip47PaymentHistory,
  payNip47Invoice,
  removeNip47Connection,
} from 'src/services/nip47-service';
import type { Nip47ConnectionSummary, Nip47PaymentHistoryEntry } from 'src/types/nip47';

const connections = ref<Nip47ConnectionSummary[]>([]);
const nwcUri = ref('');
const label = ref('');
const loading = ref(false);
const testingConnectionId = ref<string | null>(null);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const balances = ref<Record<string, number>>({});
const selectedPaymentConnection = ref<Nip47ConnectionSummary | null>(null);
const paymentInvoice = ref('');
const paymentApprovalChecked = ref(false);
const paymentDialogOpen = ref(false);
const payingConnectionId = ref<string | null>(null);
const lastPaymentPreimage = ref<string | null>(null);
const paymentHistory = ref<Nip47PaymentHistoryEntry[]>([]);
const historyLoading = ref(false);

const hasConnections = computed(() => connections.value.length > 0);

const parsedInvoiceAmount = computed(() => parseBolt11Amount(paymentInvoice.value));

function shortHex(value: string): string {
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}…${value.slice(-8)}`;
}

function formatMsat(msat: number): string {
  const sats = msat / 1000;
  return `${sats.toLocaleString(undefined, { maximumFractionDigits: 3 })} sats`;
}

function parseBolt11Amount(invoice: string): string {
  const normalized = invoice.trim().toLowerCase();
  const match = /^ln(?:bc|tb|bcrt)(\d+[munp]?)?1/.exec(normalized);
  const amount = match?.[1];
  if (!amount) {
    return 'Amount not encoded in invoice';
  }

  const suffix = amount.at(-1);
  const hasSuffix = suffix === 'm' || suffix === 'u' || suffix === 'n' || suffix === 'p';
  const numericPart = hasSuffix ? amount.slice(0, -1) : amount;
  const value = Number(numericPart);
  if (!Number.isFinite(value)) {
    return 'Unable to parse invoice amount';
  }

  const sats = suffix === 'm'
    ? value * 100_000
    : suffix === 'u'
      ? value * 100
      : suffix === 'n'
        ? value * 0.1
        : suffix === 'p'
          ? value * 0.0001
          : value * 100_000_000;

  return `${sats.toLocaleString(undefined, { maximumFractionDigits: 4 })} sats`;
}

function shortInvoice(invoice: string): string {
  const normalized = invoice.trim();
  if (normalized.length <= 42) return normalized;
  return `${normalized.slice(0, 24)}…${normalized.slice(-12)}`;
}

function setError(error: unknown): void {
  errorMessage.value = error instanceof Error ? error.message : String(error);
  successMessage.value = null;
}

async function refreshPaymentHistory(): Promise<void> {
  historyLoading.value = true;
  try {
    paymentHistory.value = await listNip47PaymentHistory();
  } catch (error: unknown) {
    setError(error);
  } finally {
    historyLoading.value = false;
  }
}

async function refreshConnections(): Promise<void> {
  loading.value = true;
  errorMessage.value = null;
  try {
    connections.value = await listNip47Connections();
    await refreshPaymentHistory();
  } catch (error: unknown) {
    setError(error);
  } finally {
    loading.value = false;
  }
}

async function importConnection(): Promise<void> {
  loading.value = true;
  errorMessage.value = null;
  successMessage.value = null;
  try {
    await importNip47Connection({
      uri: nwcUri.value,
      ...(label.value.trim() ? { label: label.value.trim() } : {}),
    });
    nwcUri.value = '';
    label.value = '';
    successMessage.value = 'Wallet connection imported into the encrypted vault.';
    await refreshConnections();
  } catch (error: unknown) {
    setError(error);
  } finally {
    loading.value = false;
  }
}

async function testInfo(connection: Nip47ConnectionSummary): Promise<void> {
  testingConnectionId.value = connection.id;
  errorMessage.value = null;
  successMessage.value = null;
  try {
    const info = await getNip47Info(connection.id);
    successMessage.value = `Wallet info loaded. Capabilities: ${info.capabilities.join(', ') || 'none advertised'}.`;
    await refreshConnections();
  } catch (error: unknown) {
    setError(error);
  } finally {
    testingConnectionId.value = null;
  }
}

async function testBalance(connection: Nip47ConnectionSummary): Promise<void> {
  testingConnectionId.value = connection.id;
  errorMessage.value = null;
  successMessage.value = null;
  try {
    const balance = await getNip47Balance(connection.id);
    balances.value = {
      ...balances.value,
      [connection.id]: balance.balanceMsat,
    };
    successMessage.value = `Balance loaded for ${connection.label}.`;
  } catch (error: unknown) {
    setError(error);
  } finally {
    testingConnectionId.value = null;
  }
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}

function openPaymentDialog(connection: Nip47ConnectionSummary): void {
  selectedPaymentConnection.value = connection;
  paymentInvoice.value = '';
  paymentApprovalChecked.value = false;
  lastPaymentPreimage.value = null;
  errorMessage.value = null;
  successMessage.value = null;
  paymentDialogOpen.value = true;
}

async function approvePayment(): Promise<void> {
  const connection = selectedPaymentConnection.value;
  if (!connection) {
    setError(new Error('No wallet connection selected'));
    return;
  }

  payingConnectionId.value = connection.id;
  errorMessage.value = null;
  successMessage.value = null;
  lastPaymentPreimage.value = null;
  try {
    const payment = await payNip47Invoice(connection.id, paymentInvoice.value);
    lastPaymentPreimage.value = payment.preimage;
    successMessage.value = payment.feesPaidMsat !== undefined
      ? `Payment sent. Fees paid: ${formatMsat(payment.feesPaidMsat)}.`
      : 'Payment sent.';
    paymentDialogOpen.value = false;
    await refreshPaymentHistory();
  } catch (error: unknown) {
    setError(error);
    await refreshPaymentHistory();
  } finally {
    payingConnectionId.value = null;
  }
}

async function removeConnection(connection: Nip47ConnectionSummary): Promise<void> {
  loading.value = true;
  errorMessage.value = null;
  successMessage.value = null;
  try {
    await removeNip47Connection(connection.id);
    successMessage.value = 'Wallet connection removed from this vault.';
    await refreshConnections();
  } catch (error: unknown) {
    setError(error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void refreshConnections();
});
</script>

<template>
  <q-page padding class="wallet-connections-page">
    <div class="row items-start q-col-gutter-lg">
      <div class="col-12 col-md-5">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h5">Wallet Connections</div>
            <p class="text-body2 text-grey-7 q-mb-none">
              Import Nostr Wallet Connect URIs for Lightning wallet access. Secrets are stored inside the encrypted Diogel vault.
            </p>
          </q-card-section>

          <q-separator />

          <q-card-section class="q-gutter-md">
            <q-input
              v-model="label"
              outlined
              label="Connection label"
              hint="Optional. Example: Alby, Mutiny, Home node"
            />
            <q-input
              v-model="nwcUri"
              outlined
              type="textarea"
              autogrow
              label="NWC URI"
              placeholder="nostr+walletconnect://..."
            />
            <q-btn
              color="primary"
              unelevated
              no-caps
              :loading="loading"
              :disable="!nwcUri.trim()"
              label="Import connection"
              @click="importConnection"
            />
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-7">
        <q-banner v-if="errorMessage" rounded class="bg-negative text-white q-mb-md">
          {{ errorMessage }}
        </q-banner>
        <q-banner v-if="successMessage" rounded class="bg-positive text-white q-mb-md">
          {{ successMessage }}
        </q-banner>

        <q-card flat bordered>
          <q-card-section class="row items-center justify-between">
            <div>
              <div class="text-h6">Configured connections</div>
              <div class="text-caption text-grey-7">No page-provider API is exposed in this MVP.</div>
            </div>
            <q-btn flat round icon="refresh" :loading="loading" @click="refreshConnections" />
          </q-card-section>

          <q-separator />

          <q-card-section v-if="!hasConnections" class="text-grey-7">
            No wallet connections imported yet.
          </q-card-section>

          <q-list v-else separator>
            <q-item v-for="connection in connections" :key="connection.id" class="q-py-md">
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ connection.label }}</q-item-label>
                <q-item-label caption>
                  Wallet: {{ shortHex(connection.walletServicePubkey) }} · Client: {{ shortHex(connection.clientPubkey) }}
                </q-item-label>
                <q-item-label caption>
                  Relays: {{ connection.relays.join(', ') }}
                </q-item-label>
                <q-item-label v-if="connection.capabilities.length" caption>
                  Capabilities: {{ connection.capabilities.join(', ') }}
                </q-item-label>
                <q-item-label v-if="balances[connection.id] !== undefined" caption class="text-positive">
                  Last balance check: {{ formatMsat(balances[connection.id]!) }}
                </q-item-label>
              </q-item-section>

              <q-item-section side>
                <div class="row q-gutter-sm">
                  <q-btn
                    dense
                    outline
                    no-caps
                    color="primary"
                    label="Info"
                    :loading="testingConnectionId === connection.id"
                    @click="testInfo(connection)"
                  />
                  <q-btn
                    dense
                    outline
                    no-caps
                    color="secondary"
                    label="Balance"
                    :loading="testingConnectionId === connection.id"
                    @click="testBalance(connection)"
                  />
                  <q-btn
                    dense
                    unelevated
                    no-caps
                    color="warning"
                    text-color="black"
                    label="Pay invoice"
                    :disable="!connection.capabilities.includes('pay_invoice')"
                    :loading="payingConnectionId === connection.id"
                    @click="openPaymentDialog(connection)"
                  />
                  <q-btn
                    dense
                    flat
                    no-caps
                    color="negative"
                    label="Remove"
                    @click="removeConnection(connection)"
                  />
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>

        <q-card flat bordered class="q-mt-lg">
          <q-card-section class="row items-center justify-between">
            <div>
              <div class="text-h6">Payment history</div>
              <div class="text-caption text-grey-7">
                Stored inside the encrypted vault. Latest 100 payment attempts only.
              </div>
            </div>
            <q-btn flat round icon="refresh" :loading="historyLoading" @click="refreshPaymentHistory" />
          </q-card-section>

          <q-separator />

          <q-card-section v-if="paymentHistory.length === 0" class="text-grey-7">
            No payment attempts recorded yet.
          </q-card-section>

          <q-list v-else separator>
            <q-item v-for="entry in paymentHistory" :key="entry.id" class="q-py-md">
              <q-item-section>
                <q-item-label class="row items-center q-gutter-sm">
                  <q-badge
                    :color="entry.status === 'succeeded' ? 'positive' : 'negative'"
                    :label="entry.status"
                  />
                  <span class="text-weight-medium">{{ entry.connectionLabel }}</span>
                </q-item-label>
                <q-item-label caption>
                  {{ formatTimestamp(entry.createdAt) }}
                </q-item-label>
                <q-item-label caption>
                  Amount: {{ entry.amountMsat !== undefined ? formatMsat(entry.amountMsat) : 'unknown' }}
                  <span v-if="entry.feesPaidMsat !== undefined">
                    · Fees: {{ formatMsat(entry.feesPaidMsat) }}
                  </span>
                </q-item-label>
                <q-item-label v-if="entry.paymentHash" caption>
                  Payment hash: {{ shortHex(entry.paymentHash) }}
                </q-item-label>
                <q-item-label caption class="break-word">
                  Invoice: {{ entry.invoicePreview }}
                </q-item-label>
                <q-item-label v-if="entry.error" caption class="text-negative break-word">
                  Error: {{ entry.error }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>
    </div>

    <q-dialog v-model="paymentDialogOpen" persistent>
      <q-card class="payment-approval-card">
        <q-card-section>
          <div class="text-h6">Approve Lightning payment</div>
          <p class="text-body2 text-grey-7 q-mb-none">
            This sends real money through the selected NWC wallet connection. Review it carefully before approving.
          </p>
        </q-card-section>

        <q-separator />

        <q-card-section class="q-gutter-md">
          <div v-if="selectedPaymentConnection">
            <div class="text-caption text-grey-7">Wallet connection</div>
            <div class="text-body1 text-weight-medium">{{ selectedPaymentConnection.label }}</div>
            <div class="text-caption text-grey-7">
              {{ selectedPaymentConnection.lud16 || shortHex(selectedPaymentConnection.walletServicePubkey) }}
            </div>
          </div>

          <q-input
            v-model="paymentInvoice"
            outlined
            type="textarea"
            autogrow
            label="BOLT11 invoice"
            placeholder="lnbc..."
          />

          <q-card flat bordered class="q-pa-md payment-review-card">
            <div class="text-caption text-grey-7">Parsed amount</div>
            <div class="text-subtitle1 text-weight-bold">{{ parsedInvoiceAmount }}</div>
            <div class="text-caption text-grey-7 q-mt-sm">Invoice preview</div>
            <div class="text-body2 break-word">{{ shortInvoice(paymentInvoice) || 'No invoice entered' }}</div>
          </q-card>

          <q-checkbox
            v-model="paymentApprovalChecked"
            color="negative"
            label="I understand this will attempt to pay the invoice using this wallet connection."
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn
            flat
            no-caps
            label="Cancel"
            :disable="payingConnectionId !== null"
            @click="paymentDialogOpen = false"
          />
          <q-btn
            unelevated
            no-caps
            color="negative"
            label="Approve and pay"
            :loading="payingConnectionId !== null"
            :disable="!paymentInvoice.trim() || !paymentApprovalChecked"
            @click="approvePayment"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.payment-approval-card {
  width: min(560px, 92vw);
}

.break-word {
  word-break: break-all;
}

.payment-review-card {
  background: rgba(249, 115, 22, 0.12);
}

.body--dark .payment-review-card {
  background: rgba(249, 115, 22, 0.18);
}
</style>
