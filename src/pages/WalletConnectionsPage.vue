<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  getNip47Balance,
  getNip47Info,
  importNip47Connection,
  listNip47Connections,
  removeNip47Connection,
} from 'src/services/nip47-service';
import type { Nip47ConnectionSummary } from 'src/types/nip47';

const connections = ref<Nip47ConnectionSummary[]>([]);
const nwcUri = ref('');
const label = ref('');
const loading = ref(false);
const testingConnectionId = ref<string | null>(null);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const balances = ref<Record<string, number>>({});

const hasConnections = computed(() => connections.value.length > 0);

function shortHex(value: string): string {
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}…${value.slice(-8)}`;
}

function formatMsat(msat: number): string {
  const sats = msat / 1000;
  return `${sats.toLocaleString(undefined, { maximumFractionDigits: 3 })} sats`;
}

function setError(error: unknown): void {
  errorMessage.value = error instanceof Error ? error.message : String(error);
  successMessage.value = null;
}

async function refreshConnections(): Promise<void> {
  loading.value = true;
  errorMessage.value = null;
  try {
    connections.value = await listNip47Connections();
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
      </div>
    </div>
  </q-page>
</template>
