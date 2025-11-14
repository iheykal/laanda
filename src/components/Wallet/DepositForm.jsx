import React, { useState } from 'react';
import { transactionAPI } from '../../utils/api';
import styles from './Wallet.module.css';

const DepositForm = ({ onSuccess }) => {
    const [formData, setFormData] = useState({
        amount: '',
        phoneNumber: '',
        senderName: ''
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

        if (!formData.amount || formData.amount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (!formData.phoneNumber) {
            setError('Please enter your phone number');
            return;
        }

        if (!formData.senderName) {
            setError('Please enter your name');
            return;
        }

        setLoading(true);
        const result = await transactionAPI.requestDeposit(formData);
        setLoading(false);

        if (result.error) {
            setError(result.error);
        } else {
            setSuccess('Deposit request submitted successfully! Admin will approve it soon.');
            setFormData({
                amount: '',
                phoneNumber: '',
                senderName: ''
            });
            if (onSuccess) {
                setTimeout(onSuccess, 2000);
            }
        }
    };

    return (
        <div className={styles.formContainer}>
            <h3>Request Deposit</h3>
            <div className={styles.infoBox}>
                <p><strong>Kusoo dir lacagta:</strong></p>
                <p style={{fontSize: '18px', fontWeight: 'bold'}}>📱 EVC Plus: 0610251014</p>
                <p className={styles.note}>
                    Markii aad soo dirto screenshot kasoo qaad nooguso dir WhatsApp keena
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
                    <label htmlFor="senderName">Your Name</label>
                    <input
                        type="text"
                        id="senderName"
                        name="senderName"
                        value={formData.senderName}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        required
                    />
                </div>

                <button 
                    type="submit" 
                    className={styles.submitButton}
                    disabled={loading}
                >
                    {loading ? 'Submitting...' : 'Submit Deposit Request'}
                </button>
            </form>
        </div>
    );
};

export default DepositForm;

