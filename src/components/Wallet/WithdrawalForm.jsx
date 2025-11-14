import React, { useState } from 'react';
import { transactionAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import styles from './Wallet.module.css';

const WithdrawalForm = ({ onSuccess }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        amount: '',
        phoneNumber: '',
        recipientName: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const amount = parseFloat(formData.amount);

        if (!amount || amount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (amount > user.balance) {
            setError(`Insufficient balance. You have $${user.balance.toFixed(2)}`);
            return;
        }

        if (!formData.phoneNumber) {
            setError('Please enter your phone number');
            return;
        }

        if (!formData.recipientName) {
            setError('Please enter your name');
            return;
        }

        setLoading(true);
        const result = await transactionAPI.requestWithdrawal(formData);
        setLoading(false);

        if (result.error) {
            setError(result.error);
        } else {
            setSuccess('Withdrawal request submitted successfully! Admin will process it soon.');
            setFormData({
                amount: '',
                phoneNumber: '',
                recipientName: ''
            });
            if (onSuccess) {
                setTimeout(onSuccess, 2000);
            }
        }
    };

    return (
        <div className={styles.formContainer}>
            <h3>Request Withdrawal</h3>
            <div className={styles.infoBox}>
                <p><strong>Available Balance:</strong> ${user?.balance?.toFixed(2) || '0.00'}</p>
                <p className={styles.note}>
                    Admin will send money to your phone number after approval.
                </p>
            </div>

            {error && <div className={styles.errorMessage}>{error}</div>}
            {success && <div className={styles.successMessage}>{success}</div>}

            <form onSubmit={handleSubmit} className={styles.depositForm}>
                <div className={styles.formGroup}>
                    <label htmlFor="amount">Amount ($)</label>
                    <input
                        type="number"
                        id="amount"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        placeholder="Enter amount"
                        min="1"
                        max={user?.balance || 0}
                        step="0.01"
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="phoneNumber">Your Phone Number</label>
                    <input
                        type="tel"
                        id="phoneNumber"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        placeholder="+252612345678"
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="recipientName">Your Name</label>
                    <input
                        type="text"
                        id="recipientName"
                        name="recipientName"
                        value={formData.recipientName}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        required
                    />
                </div>

                <button 
                    type="submit" 
                    className={styles.submitButton}
                    disabled={loading || user?.balance <= 0}
                >
                    {loading ? 'Submitting...' : 'Submit Withdrawal Request'}
                </button>
            </form>
        </div>
    );
};

export default WithdrawalForm;

