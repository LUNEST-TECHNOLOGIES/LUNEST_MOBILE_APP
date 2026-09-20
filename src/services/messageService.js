import apiClient from "./apiClient";

class MessageService {
  /**
   * Start or retrieve an enquiry conversation for a property listing
   * @param {Object} params
   * @param {string} params.listingId
   * @param {string} [params.initialMessage]
   * @param {string} [params.bookingId]
   */
  async startEnquiry({ listingId, initialMessage, bookingId }) {
    try {
      const response = await apiClient.post("/v1/conversations/enquiry", {
        listingId,
        initialMessage,
        bookingId,
      });
      return response?.body || response?.data || response;
    } catch (error) {
      console.error("[MessageService] startEnquiry error:", error);
      throw error;
    }
  }

  /**
   * Fetch all conversations for the authenticated user
   */
  async getConversations() {
    try {
      const response = await apiClient.get("/v1/conversations");
      return response?.body || response?.data || [];
    } catch (error) {
      console.error("[MessageService] getConversations error:", error);
      throw error;
    }
  }

  /**
   * Get single conversation details
   * @param {string} conversationId
   */
  async getConversation(conversationId) {
    try {
      const response = await apiClient.get(`/v1/conversations/${conversationId}`);
      return response?.body || response?.data || null;
    } catch (error) {
      console.error("[MessageService] getConversation error:", error);
      throw error;
    }
  }

  /**
   * Fetch messages for a conversation
   * @param {string} conversationId
   */
  async getMessages(conversationId) {
    try {
      const response = await apiClient.get(`/v1/conversations/${conversationId}/messages`);
      return response?.body || response?.data || [];
    } catch (error) {
      console.error("[MessageService] getMessages error:", error);
      throw error;
    }
  }

  /**
   * Send a message in a conversation
   * @param {string} conversationId
   * @param {Object} params
   * @param {string} params.content
   * @param {string} [params.clientMessageId]
   */
  async sendMessage(conversationId, { content, clientMessageId }) {
    try {
      const response = await apiClient.post(`/v1/conversations/${conversationId}/messages`, {
        content,
        clientMessageId,
      });
      return response?.body || response?.data || response;
    } catch (error) {
      console.error("[MessageService] sendMessage error:", error);
      throw error;
    }
  }

  /**
   * Block a participant
   * @param {string} conversationId
   * @param {string} [reason]
   */
  async blockUser(conversationId, reason) {
    try {
      const response = await apiClient.post(`/v1/conversations/${conversationId}/block`, {
        reason,
      });
      return response?.body || response?.data || response;
    } catch (error) {
      console.error("[MessageService] blockUser error:", error);
      throw error;
    }
  }

  /**
   * Unblock a participant
   * @param {string} conversationId
   */
  async unblockUser(conversationId) {
    try {
      const response = await apiClient.post(`/v1/conversations/${conversationId}/unblock`, {});
      return response?.body || response?.data || response;
    } catch (error) {
      console.error("[MessageService] unblockUser error:", error);
      throw error;
    }
  }

  /**
   * Toggle mute status for notifications
   * @param {string} conversationId
   * @param {boolean} muted
   */
  async toggleMute(conversationId, muted) {
    try {
      const response = await apiClient.post(`/v1/conversations/${conversationId}/mute`, {
        muted,
      });
      return response?.body || response?.data || response;
    } catch (error) {
      console.error("[MessageService] toggleMute error:", error);
      throw error;
    }
  }

  /**
   * Report a conversation or message
   * @param {string} conversationId
   * @param {Object} params
   * @param {string} [params.messageId]
   * @param {string} params.reason
   * @param {string} [params.explanation]
   */
  async report(conversationId, { messageId, reason, explanation }) {
    try {
      const response = await apiClient.post(`/v1/conversations/${conversationId}/report`, {
        messageId,
        reason,
        explanation,
      });
      return response?.body || response?.data || response;
    } catch (error) {
      console.error("[MessageService] report error:", error);
      throw error;
    }
  }

  /**
   * Soft-delete a conversation for the user
   * @param {string} conversationId
   */
  async deleteConversation(conversationId) {
    try {
      const response = await apiClient.delete(`/v1/conversations/${conversationId}`);
      return response?.body || response?.data || response;
    } catch (error) {
      console.error("[MessageService] deleteConversation error:", error);
      throw error;
    }
  }
}

const messageService = new MessageService();
export default messageService;
