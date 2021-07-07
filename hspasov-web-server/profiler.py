from datetime import datetime, timedelta
from config import CONFIG


class MonitDuration:
    def __init__(self, label):
        self.label = label
        self.begin = None
        self.end = None

    def mark_begin(self):
        self.begin = MonitDuration.get_current_time()

    def mark_end(self):
        self.end = MonitDuration.get_current_time()

    @staticmethod
    def get_current_time():
        return datetime.now()


class ClientConnectionMonit:
    def __init__(self, monit_duration_labels):
        self.monit_durations = {}

        for label in monit_duration_labels:
            self.monit_durations[label] = MonitDuration(label)

    def mark_begin(self, label):
        self.monit_durations[label].mark_begin()

    def mark_end(self, label):
        self.monit_durations[label].mark_end()


class Profiler:
    def __init__(self):
        self._client_conn_monits = []
        self._event_loop_time = timedelta(0)
        self._event_loop_begin_time = None
        self._event_loop_iterations = []
        self._registering_temp_begin = None
        self._registering_time = timedelta(0)
        self._registering_end_calls = 0
        self._event_loop_end_calls = 0
        self._unsuccessful_locks = 0

    def mark_registering_begin(self):
        self._registering_temp_begin = datetime.now()

    def mark_registering_end(self):
        self._registering_time += datetime.now() - self._registering_temp_begin
        self._registering_temp_begin = None

    def mark_event_loop_iteration(self, action_requests):
        self._event_loop_iterations.append(action_requests)

    def mark_event_loop_begin_time(self):
        self._event_loop_begin_time = datetime.now()

    def mark_event_loop_end(self):
        assert self._event_loop_begin_time is not None

        self._event_loop_time += datetime.now() - self._event_loop_begin_time
        self._event_loop_begin_time = None

    def mark_unsuccessful_lock(self):
        self._unsuccessful_locks += 1

    def add_monit(self, monit):
        assert len(self._client_conn_monits) < CONFIG['max_monits']

        self._client_conn_monits.append(monit)

    def get_event_loop_iterations(self):
        return self._event_loop_iterations

    def get_averages(self):
        if len(self._client_conn_monits) == 0:
            return None

        sample_client_connection = self._client_conn_monits[0]

        sums_durations = {}
        monits_amount = {}

        for label in sample_client_connection.monit_durations.keys():
            sums_durations[label] = timedelta(0)
            monits_amount[label] = 0

        for monit in self._client_conn_monits:
            for duration in monit.monit_durations.values():
                if duration.begin is not None:
                    assert isinstance(duration.begin, datetime)
                    assert isinstance(duration.end, datetime)

                    sums_durations[duration.label] += duration.end - duration.begin
                    monits_amount[duration.label] += 1

        averages = {}

        for label in sample_client_connection.monit_durations.keys():
            if monits_amount[label] > 0:
                average_duration = sums_durations[label] / monits_amount[label]
                averages[label] = average_duration.microseconds

        return averages
