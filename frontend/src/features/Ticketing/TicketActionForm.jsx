import { field } from './ticketingUi';
import { useState } from 'react';
import FormContainer from '../../Components/FormContainer';
import { Select } from './TicketFields';
import { actionPayload, availableActions, isManager } from './ticketingHelpers';
export default function TicketActionForm({ options, saving, closeModal, onSubmit, detail, state }) {
const [action, setAction] = useState({action:'', note:'', assignee_id:'', resolution:'', root_cause:''});
const actions = availableActions(detail, state || {});
const manager = isManager(state?.role);
const [formError, setError] = useState('');
return (<FormContainer
                          title="Tindakan tiket"
                          description="Catatan / alasan wajib. Selesai tidak otomatis menutup tiket; pelapor atau pengelola memverifikasi."
                          isSubmitting={saving}
                          onCancel={closeModal}
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (!actions.includes(action.action)) {
                              setError('Pilih tindakan yang tersedia.');
                              return;
                            }
                            let payload;
                            try {
                              payload = actionPayload(action, detail, state);
                            } catch (error) {
                              setError(error.message);
                              return;
                            }
                            onSubmit(payload);
                          }}
                        >
                          {formError && <p role="alert" className="rounded bg-red-100 p-3 text-red-800">{formError}</p>}
<fieldset disabled={saving} className="space-y-4">
                            <Select
                              label="Tindakan"
                              value={action.action}
                              options={[
                                { value: '', label: 'Pilih tindakan' },
                                ...actions,
                              ]}
                              onChange={(v) =>
                                setAction({ ...action, action: v })
                              }
                            />
                            {action.action === 'assign' &&
                              (manager ? (
                                <Select
                                  label="Teknisi"
                                  value={action.assignee_id}
                                  options={[
                                    { value: '', label: 'Pilih teknisi' },
                                    ...(options?.technicians || []).map(
                                      (t) => ({
                                        value: t.user_id,
                                        label: t.nama_lengkap,
                                      })
                                    ),
                                  ]}
                                  onChange={(v) =>
                                    setAction({ ...action, assignee_id: v })
                                  }
                                />
                              ) : (
                                <p>Tiket akan ditugaskan kepada Anda.</p>
                              ))}
                            <label className="block">
                              Catatan / alasan
                              <textarea
                                className={field}
                                required
                                maxLength={5000}
                                value={action.note}
                                onChange={(e) =>
                                  setAction({ ...action, note: e.target.value })
                                }
                              />
                            </label>
                            {action.action === 'resolve' && (
                              <>
                                <label className="block">
                                  Resolusi
                                  <textarea
                                    className={field}
                                    required
                                    maxLength={5000}
                                    value={action.resolution}
                                    onChange={(e) =>
                                      setAction({
                                        ...action,
                                        resolution: e.target.value,
                                      })
                                    }
                                  />
                                </label>
                                <label className="block">
                                  Akar masalah (opsional)
                                  <textarea
                                    className={field}
                                    maxLength={5000}
                                    value={action.root_cause}
                                    onChange={(e) =>
                                      setAction({
                                        ...action,
                                        root_cause: e.target.value,
                                      })
                                    }
                                  />
                                </label>
                              </>
                            )}
                          </fieldset>
                        </FormContainer>);
}
