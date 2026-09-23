export default class TelemetryClient {
  constructor(backendUrl = 'http://localhost:8000') {
    this.backendUrl = backendUrl;
    this.offlineQueue = [];

    window.SESSION_ID = 'session_' + Date.now();

    this._retryInterval = setInterval(() => this._retryQueue(), 10000);
  }

  async _send(url, data) {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return true;
    } catch {
      return false;
    }
  }

  async _retryQueue() {
    if (this.offlineQueue.length === 0) return;

    const batch = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const item of batch) {
      const ok = await this._send(item.url, item.data);
      if (!ok) this.offlineQueue.push(item);
    }
  }

  async postSafetyEvent(eventData) {
    const url = this.backendUrl + '/safety/event';
    const ok = await this._send(url, eventData);
    if (!ok) this.offlineQueue.push({ url, data: eventData });
  }

  async postTrainingScore(scoreData) {
    const url = this.backendUrl + '/training/score';
    const ok = await this._send(url, scoreData);
    if (!ok) this.offlineQueue.push({ url, data: scoreData });
  }

  async postTelemetryEvent(eventData) {
    const url = this.backendUrl + '/telemetry/event';
    const ok = await this._send(url, eventData);
    if (!ok) this.offlineQueue.push({ url, data: eventData });
  }
}
